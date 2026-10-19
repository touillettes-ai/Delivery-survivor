// ==== Classement partagé (Firebase Realtime Database, via son API REST) ====
// Adresse de la base, à copier depuis la console Firebase (Realtime Database).
// Tant qu'elle est vide, le classement est masqué dans le jeu.
const LEADERBOARD_URL = 'https://delivery-survivor-default-rtdb.europe-west1.firebasedatabase.app';
const LEADERBOARD_SIZE = 10;

const Leaderboard = {
  get enabled() { return !!LEADERBOARD_URL; },

  // Les meilleurs scores d'un niveau, du plus haut au plus bas
  async top(level, n = LEADERBOARD_SIZE) {
    const res = await fetch(`${LEADERBOARD_URL}/scores/${level}.json?orderBy=%22score%22&limitToLast=${n}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return Object.values((await res.json()) || {}).sort((a, b) => b.score - a.score);
  },

  // Envoie un score (la date est fixée par le serveur Firebase)
  async submit(level, entry) {
    const res = await fetch(`${LEADERBOARD_URL}/scores/${level}.json`, {
      method: 'POST',
      body: JSON.stringify({ ...entry, date: { '.sv': 'timestamp' } }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  },
};

// Les pseudos viennent des joueurs : on les échappe avant de les afficher
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tableau HTML d'un classement ; `mine` met en valeur le score qu'on vient d'envoyer
function leaderboardTable(rows, mine) {
  if (!rows.length) return '<p class="help">Aucun score pour l\'instant : sois le premier !</p>';
  return `<table class="dmg lb"><thead><tr><th>#</th><th>Pseudo</th><th>Perso</th><th>Score</th><th></th></tr></thead><tbody>` +
    rows.map((r, i) => {
      const me = mine && r.name === mine.name && r.score === mine.score;
      const c = CHARACTERS[r.char];
      return `<tr${me ? ' class="me"' : ''}><td class="num">${['🥇', '🥈', '🥉'][i] || i + 1}</td><td><b>${escapeHtml(r.name)}</b></td>
        <td>${c ? escapeHtml(c.name) : ''}</td><td class="num">${Math.round(r.score).toLocaleString('fr-FR')}</td><td>${r.won ? '✅' : '❌'} ${(DIFFICULTIES[r.diff] || {}).icon || ''}</td></tr>`;
    }).join('') + '</tbody></table>';
}
