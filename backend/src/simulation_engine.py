import pandas as pd
import numpy as np
import os
from .data_generator import generate_atm_data
from .features import add_advanced_features
from .model_trainer import train_model

HISTORY_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'atm_history.csv')

class SimulationEngine:
    def __init__(self):
        self.data = None
        self.next_event = None
        self.load_or_init_data()

    def set_next_event(self, event_type):
        """Injects an event for the NEXT simulation step."""
        print(f"Event Injected: {event_type}")
        self.next_event = event_type

    def load_or_init_data(self):
        """Loads history from CSV or generates fresh if missing."""
        if os.path.exists(HISTORY_FILE):
            print("Loading simulation history...")
            try:
                self.data = pd.read_csv(HISTORY_FILE, parse_dates=['Date'])
            except Exception as e:
                print(f"Error loading history: {e}. Regenerating.")
                self.reset_simulation()
        else:
            self.reset_simulation()

    def reset_simulation(self):
        """Resets the simulation to the initial 365 day state."""
        print("Initializing fresh simulation...")
        raw = generate_atm_data(n_days=365)
        self.data = add_advanced_features(raw)
        self.save_data()

    def save_data(self):
        """Persists current state to CSV."""
        os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
        self.data.to_csv(HISTORY_FILE, index=False)

    def advance_day(self):
        """
        Simulates the PASSAGE OF TIME.
        1. 'Yesterday' becomes history (we generate 'actuals' for the day that just passed).
        2. We append this new day to our history.
        3. Implementation Detail: Since `generate_atm_data` is stateless, we manually
           generate one new day appearing after the last known date.
        """
        last_date = self.data['Date'].max()
        new_date = last_date + pd.Timedelta(days=1)
        
        print(f"Advancing simulation to {new_date.date()}...")
        
        # Generate 1 day of data for each ATM
        new_rows = []
        n_atms = 5
        for atm_id in range(n_atms):
            atm_type = 'Market' if atm_id % 2 == 0 else 'Residential'
            
            # Re-use logic from data_generator (simplified inline for the simulation step)
            base_withdraw = np.random.normal(500000, 50000)
            base_deposit = np.random.normal(300000, 30000)
            
            is_payday = 1 if new_date.day in [1, 2, 3, 4, 5, 30, 31] else 0
            if is_payday: base_withdraw *= 1.4
            
            is_weekend = 1 if new_date.dayofweek >= 5 else 0
            if is_weekend: base_withdraw *= 1.2
            
            if atm_type == 'Market':
                base_deposit *= 1.6
                base_withdraw *= 0.8
            else:
                base_deposit *= 0.3
                base_withdraw *= 1.2
                
            # Event Logic
            is_festival = 0
            if self.next_event == 'FESTIVAL':
                is_festival = 1
            else:
                is_festival = np.random.choice([0, 1], p=[0.98, 0.02])
            
            if is_festival: 
                base_withdraw *= 2.5 # Massive spike for "Shock" demo
            
            if self.next_event == 'STORM':
                base_withdraw *= 0.2 # 80% Drop
                base_deposit *= 0.2
            
            row = {
                'Date': new_date,
                'ATM_ID': atm_id,
                'Location_Type': atm_type,
                'Is_Weekend': is_weekend,
                'Is_Payday': is_payday,
                'Is_Festival': is_festival,
                'Withdrawals': int(base_withdraw),
                'Deposits': int(base_deposit),
                'Net_Cash_Flow': int(base_deposit - base_withdraw)
            }
            new_rows.append(row)
            
        new_df = pd.DataFrame(new_rows)
        
        # Merge and re-calculate features (Rolling/Lag needs full history)
        # We append raw then re-process features. Efficient enough for this scale.
        # Note: add_advanced_features expects certain columns.
        # Ideally we'd just append, but we need lag features which depend on history.
        
        # Drop old features to avoid dupes/conflicts if we re-run feature eng
        base_cols = ['Date', 'ATM_ID', 'Location_Type', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 'Withdrawals', 'Deposits', 'Net_Cash_Flow']
        current_clean = self.data[base_cols].copy()
        
        updated_df = pd.concat([current_clean, new_df], ignore_index=True)
        self.data = add_advanced_features(updated_df)
        self.save_data()
        
        # Reset event
        self.next_event = None
        
        return new_date

    def get_latest_data(self):
        return self.data
