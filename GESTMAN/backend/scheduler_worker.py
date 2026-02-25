#!/usr/bin/env python3
"""
GESTMAN Scheduler Worker
Processo separato per eseguire lo scheduler APScheduler in produzione.

Uso:
    python scheduler_worker.py

In alternativa, se vuoi usare il server principale:
    ENABLE_SCHEDULER=true gunicorn -c gunicorn.conf.py server:app
"""

import os
import sys
import time
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger

# Importa la funzione di controllo alert
sys.path.insert(0, os.path.dirname(__file__))
from server import scheduled_alert_check

def main():
    print("[SCHEDULER WORKER] 🚀 Avvio scheduler dedicato per alert automatici...")
    
    # Usa BlockingScheduler per un processo dedicato
    scheduler = BlockingScheduler()
    
    # Job giornaliero alle 7:00 AM
    scheduler.add_job(
        func=scheduled_alert_check,
        trigger=CronTrigger(hour=7, minute=0),
        id='alert_scadenze_check',
        name='Controllo Alert Scadenze Giornaliero',
        replace_existing=True,
        misfire_grace_time=3600  # 1 ora di grace time se il sistema era spento
    )
    
    print("[SCHEDULER WORKER] ✓ Scheduler configurato")
    print("[SCHEDULER WORKER] ⏰ Job programmato: ogni giorno alle 7:00 AM")
    print("[SCHEDULER WORKER] 🔄 In attesa del prossimo trigger...")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("\n[SCHEDULER WORKER] ⏹ Scheduler terminato")
        scheduler.shutdown()

if __name__ == "__main__":
    main()
