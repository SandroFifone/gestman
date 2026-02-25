# GESTMAN APScheduler - Note di Deployment

## Problema: Duplicazione job con Gunicorn

APScheduler in produzione con Gunicorn (multipli worker) causerebbe la **duplicazione dei job schedulati**. 
Ogni worker avvierebbe il proprio scheduler → alert generati N volte!

## Soluzioni Implementate

### Opzione 1: Processo Scheduler Dedicato (RACCOMANDATO)

Usa `scheduler_worker.py` come processo separato gestito da Supervisor:

```bash
# Configurazione Supervisor
sudo nano /etc/supervisor/conf.d/gestman-scheduler.conf
```

Contenuto:
```ini
[program:gestman-scheduler]
command=/home/USER/gestman-app/backend/venv/bin/python /home/USER/gestman-app/backend/scheduler_worker.py
directory=/home/USER/gestman-app/backend
user=USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/gestman-scheduler.log
environment=PYTHONPATH="/home/USER/gestman-app/backend"
```

Poi:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gestman-scheduler
sudo supervisorctl status gestman-scheduler
```

### Opzione 2: Scheduler nel server principale

Se vuoi evitare un processo separato, abilita lo scheduler in UNO solo dei worker Gunicorn:

```bash
ENABLE_SCHEDULER=true gunicorn -c gunicorn.conf.py server:app
```

⚠️ **ATTENZIONE**: Se usi più worker Gunicorn, solo il primo avrà lo scheduler attivo.

### Opzione 3: Cron (Fallback)

Se le opzioni precedenti non funzionano, usa cron di sistema:

```bash
crontab -e
```

Aggiungi:
```
0 7 * * * /home/USER/gestman-app/backend/venv/bin/python -c "from server import scheduled_alert_check; scheduled_alert_check()"
```

## Sviluppo Locale

In modalità development (`python server.py`), lo scheduler si avvia automaticamente. ✅

## Verifica Funzionamento

1. Controlla log:
   ```bash
   tail -f /var/log/gestman-scheduler.log
   ```

2. Testa manualmente:
   ```bash
   cd /home/USER/gestman-app/backend
   source venv/bin/activate
   python -c "from server import scheduled_alert_check; scheduled_alert_check()"
   ```

3. Verifica nel database:
   ```sql
   SELECT * FROM alert_scheduler_config;
   ```

## Debugging

- Log scheduler: `[SCHEDULER]` prefix nei log
- Stato toggle: controllare tabella `alert_scheduler_config`
- Last run: campo `last_run` nella tabella

## Requirements

Assicurati che `requirements.txt` contenga:
```
APScheduler==3.10.4
```

Già incluso nel file di questo progetto. ✅
