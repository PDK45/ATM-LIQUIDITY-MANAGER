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
            
            withdraw_val = int(base_withdraw)
            deposit_val = int(base_deposit)

            # Denomination logic (matches generator)
            w100, w500, w2000 = int((withdraw_val*0.3)//100), int((withdraw_val*0.6)//500), int((withdraw_val*0.1)//2000)
            d100, d500, d2000 = int((deposit_val*0.2)//100), int((deposit_val*0.75)//500), int((deposit_val*0.05)//2000)

            # Health decay
            prev_atms = self.data[self.data['ATM_ID'] == atm_id]
            prev_health = prev_atms['Health'].iloc[-1] if not prev_atms.empty else 100
            new_health = max(40, prev_health - np.random.random() * 0.5) # Slow decay

            rev = (withdraw_val // 5000) * 25 + (deposit_val // 5000) * 10
            cost = 500 + (100 - new_health) * 50

            row = {
                'Date': new_date,
                'ATM_ID': atm_id,
                'Location_Type': atm_type,
                'Is_Weekend': is_weekend,
                'Is_Payday': is_payday,
                'Is_Festival': is_festival,
                'Withdrawals': withdraw_val,
                'Deposits': deposit_val,
                'W_100': w100, 'W_500': w500, 'W_2000': w2000,
                'D_100': d100, 'D_500': d500, 'D_2000': d2000,
                'Health': new_health,
                'Revenue': int(rev),
                'Cost': int(cost),
                'Net_Cash_Flow': int(deposit_val - withdraw_val)
            }
            new_rows.append(row)
            
        new_df = pd.DataFrame(new_rows)
        
        # Drop old features to avoid dupes/conflicts
        base_cols = [
            'Date', 'ATM_ID', 'Location_Type', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 
            'Withdrawals', 'Deposits', 'W_100', 'W_500', 'W_2000', 'D_100', 'D_500', 'D_2000',
            'Health', 'Revenue', 'Cost', 'Net_Cash_Flow'
        ]
        current_clean = self.data[base_cols].copy()
        
        updated_df = pd.concat([current_clean, new_df], ignore_index=True)
        self.data = add_advanced_features(updated_df)
        self.save_data()
        
        # Reset event
        self.next_event = None
        
        return new_date

    def get_latest_data(self):
        return self.data
