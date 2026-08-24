import express from 'express';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS : le site (autre origine) doit pouvoir appeler cette API depuis le navigateur du client
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  // Private Network Access (Chrome) : autorise explicitement l'appel depuis une page
  // publique (https://...github.io) vers ce serveur en réseau privé (localhost), sinon
  // Chrome bloque silencieusement la requête même si le CORS classique est correct.
  if (req.get('Access-Control-Request-Private-Network')) {
    res.header('Access-Control-Allow-Private-Network', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// État de l'application
let config = {
  // Fichiers du site (couleurs, prix...) édités depuis la page /admin du site déployé
  // — ne fonctionne que si ce serveur tourne sur la même machine que le repo du site.
  siteConfigPath: process.env.SITE_CONFIG_PATH || path.join(__dirname, '../CFRAV.github.io/config.json'),
  sitePricesPath: process.env.SITE_PRICES_PATH || path.join(__dirname, '../CFRAV.github.io/prices.json'),
  // Mot de passe donnant accès au tableau de bord (liste des commandes) et à /admin sur le site
  adminPassword: ''
};

// Charger la configuration
function loadConfig() {
  try {
    if (fs.existsSync('config.json')) {
      config = { ...config, ...JSON.parse(fs.readFileSync('config.json', 'utf8')) };
    }
  } catch (err) {
    console.log('Aucune configuration trouvée, en attente...');
  }
}

loadConfig();

// Sur un hébergement sans disque persistant (Render...), pas de config.json à éditer :
// le mot de passe se règle via la variable d'environnement ADMIN_PASSWORD.
if (process.env.ADMIN_PASSWORD) {
  config.adminPassword = process.env.ADMIN_PASSWORD;
}

// ===== BASE DE DONNÉES (commandes) =====

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant — connexion Postgres impossible.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      telephone TEXT,
      email TEXT,
      ville TEXT,
      instagram TEXT,
      livraison_souhaitee TEXT,
      produit TEXT,
      statut TEXT DEFAULT 'Nouvelle',
      montant TEXT,
      date_creation TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

function rowToOrder(row) {
  return {
    id: row.id,
    client: [row.prenom, row.nom].filter(Boolean).join(' ') || 'Non spécifié',
    telephone: row.telephone || '',
    email: row.email || '',
    ville: row.ville || '',
    instagram: row.instagram || '',
    livraisonSouhaitee: row.livraison_souhaitee || '',
    product: row.produit || 'Non spécifié',
    status: row.statut || 'En attente',
    amount: row.montant || '-',
    date: row.date_creation || '',
    notes: row.notes || ''
  };
}

// ===== AUTHENTIFICATION (tableau de bord + page /admin du site) =====

// Sessions en mémoire : token -> expiration (ms). Perdues si le serveur redémarre (il suffit de se reconnecter).
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000; // 12h
const sessions = new Map();

function requireAuth(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const expiresAt = token && sessions.get(token);

  if (!expiresAt || expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // Prolonge la session à chaque requête authentifiée
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  next();
}

// ===== ROUTES =====

// Connexion (mot de passe -> jeton de session)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;

  if (!config.adminPassword) {
    return res.status(400).json({ error: "Aucun mot de passe admin configuré (adminPassword dans config.json)" });
  }
  if (!password || password !== config.adminPassword) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  res.json({ success: true, token });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.get('authorization').slice(7);
  sessions.delete(token);
  res.json({ success: true });
});

// Config du site (couleurs, positions de logo...) — lecture publique, écriture protégée
app.get('/api/site-config', (req, res) => {
  try {
    res.sendFile(config.siteConfigPath);
  } catch (err) {
    res.status(404).json({ error: 'introuvable' });
  }
});

app.post('/api/site-config', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(config.siteConfigPath, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Prix du site — lecture publique, écriture protégée
app.get('/api/site-prices', (req, res) => {
  try {
    res.sendFile(config.sitePricesPath);
  } catch (err) {
    res.status(404).json({ error: 'introuvable' });
  }
});

app.post('/api/site-prices', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(config.sitePricesPath, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer toutes les commandes — réservé au propriétaire (contient des données clients)
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(rows.map(rowToOrder));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une nouvelle commande (envoyée depuis le simulateur du site) — public, c'est le client qui commande
app.post('/api/orders', async (req, res) => {
  const { nom, prenom, telephone, email, ville, instagram, dateLivraisonSouhaitee, produit, montant, notes } = req.body;

  // Le formulaire envoie une date ISO (YYYY-MM-DD) : on l'affiche en format français
  let livraisonSouhaitee = '';
  if (dateLivraisonSouhaitee) {
    const d = new Date(dateLivraisonSouhaitee);
    if (!isNaN(d)) livraisonSouhaitee = d.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  }

  const id = `CMD-${Date.now()}`;

  try {
    await pool.query(
      `INSERT INTO orders (id, nom, prenom, telephone, email, ville, instagram, livraison_souhaitee, produit, statut, montant, date_creation, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Nouvelle',$10,$11,$12)`,
      [id, nom || 'Non spécifié', prenom || '', telephone || '', email || '', ville || '', instagram || '',
       livraisonSouhaitee, produit || '', montant || '', new Date().toLocaleDateString('fr-FR'), notes || '']
    );
    res.json({ success: true, id, message: '✅ Commande enregistrée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour le statut/les notes d'une commande — réservé au propriétaire
app.put('/api/orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  try {
    const { rowCount } = await pool.query(
      `UPDATE orders SET
         statut = COALESCE($2, statut),
         notes = COALESCE($3, notes)
       WHERE id = $1`,
      [id, status ?? null, notes ?? null]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json({ success: true, message: '✅ Commande mise à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une commande — réservé au propriétaire
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query('DELETE FROM orders WHERE id = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json({ success: true, message: '✅ Commande supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Télécharger un export .xlsx de toutes les commandes — réservé au propriétaire
app.get('/api/orders/export', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Commandes');
    worksheet.addRow(['Commande', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Ville', 'Instagram', 'Livraison souhaitée', 'Produit', 'Statut', 'Montant', 'Date', 'Notes']);
    rows.forEach(r => worksheet.addRow([
      r.id, r.nom, r.prenom, r.telephone, r.email, r.ville, r.instagram,
      r.livraison_souhaitee, r.produit, r.statut, r.montant, r.date_creation, r.notes
    ]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Tableau de bord lancé sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Impossible d\'initialiser la base de données:', err.message);
    process.exit(1);
  });
