import React, { useState } from "react";
import "./Auth.css";
import { API_URLS } from "../config/api";

const Auth = ({ onAuth }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Compila tutti i campi.");
      return;
    }
  // Se lo username inizia con 'imadmin', invia comunque la richiesta a /api/login
  let url = API_URLS.login;
  let body = { username, password };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore sconosciuto");
        return;
      }
      onAuth({ username: data.username, isAdmin: data.is_admin, nome: data.nome });
    } catch (err) {
      setError("Errore di connessione al server.");
    }
  };

  return (
    <div className="auth-container">
      {/* Logo AAM come sfondo */}
      <div className="auth-background-logo">
        <img src="/AAM.png" alt="AAM Logo" className="background-logo-image" />
      </div>
      
      {/* Logo AAM sopra la card */}
      <div className="auth-header-logo">
        <img src="/AAM.png" alt="AAM Logo" className="header-logo-image" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Nome utente"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="auth-error">{error}</div>}
        <button type="submit">Accedi</button>
      </form>
    </div>
  );
};

export default Auth;
