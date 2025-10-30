import React from "react";
import { API_URLS } from "../config/api";

export default function AddUserForm({ onAdd, setError }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [nome, setNome] = React.useState("");
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Compila tutti i campi per aggiungere un utente.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URLS.users, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, nome, is_admin: isAdmin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setUsername("");
      setPassword("");
      setNome("");
      setIsAdmin(false);
      onAdd();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nome utente</label>
        <input
          type="text"
          placeholder="Nome utente"
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Nome completo</label>
        <input
          type="text"
          placeholder="Nome e cognome (opzionale)"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="form-input"
        />
      </div>
      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={e => setIsAdmin(e.target.checked)}
            style={{ marginRight: 'var(--spacing-sm)' }}
          />
          Utente amministratore
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Aggiungo..." : "Aggiungi utente"}
        </button>
      </div>
    </form>
  );
}
