import pandas as pd
import numpy as np

def generate_atm_data(n_days=365, n_atms=5):
    """
    Generates synthetic ATM data simulating Indian banking patterns.
    Includes 'Deposits' to simulate Cash Recyclers (CRMs).
    """
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=n_days)
    data = []

    for atm_id in range(n_atms):
        # Even IDs = 'Market' (High Deposit), Odd IDs = 'Residential' (High Withdraw)
        atm_type = 'Market' if atm_id % 2 == 0 else 'Residential'
        
        for date in dates:
            # Base Demand Simulation
            base_withdraw = np.random.normal(500000, 50000)  # Mean 5 Lakhs
            base_deposit = np.random.normal(300000, 30000)   # Mean 3 Lakhs
            
            # --- PATTERN LOGIC ---
            # 1. Payday Effect (1st-5th & 30th-31st) -> High Withdrawals
            is_payday = 1 if date.day in [1, 2, 3, 4, 5, 30, 31] else 0
            if is_payday:
                base_withdraw *= 1.4  # 40% spike
            
            # 2. Weekend Effect
            is_weekend = 1 if date.dayofweek >= 5 else 0
            if is_weekend:
                base_withdraw *= 1.2  # 20% spike
            
            # 3. Location Logic
            if atm_type == 'Market':
                base_deposit *= 1.6   # High deposits (Shopkeepers)
                base_withdraw *= 0.8
            else: # Residential
                base_deposit *= 0.3   # Low deposits
                base_withdraw *= 1.2
            
            # 4. Festival Spikes (Random rare events)
            is_festival = np.random.choice([0, 1], p=[0.98, 0.02])
            if is_festival:
                base_withdraw *= 1.8 

            # --- DEEP ANALYTICS: Denominations, Health, Financials ---
            withdraw_val = int(base_withdraw)
            deposit_val = int(base_deposit)

            # Split withdrawals into denominations (roughly)
            # 2000s are rare (10%), 500s are common (60%), 100s are for change (30%)
            withdraw_2000 = int((withdraw_val * 0.1) // 2000)
            withdraw_500 = int((withdraw_val * 0.6) // 500)
            withdraw_100 = int((withdraw_val * 0.3) // 100)

            # Split deposits (different mix)
            deposit_2000 = int((deposit_val * 0.05) // 2000)
            deposit_500 = int((deposit_val * 0.75) // 500)
            deposit_100 = int((deposit_val * 0.20) // 100)

            # Mechanical health (Start high, decay slightly)
            health = max(0, 100 - (np.random.random() * 5)) # Initial health variation
            
            # Revenue (₹25 per withdrawal average, ₹10 per deposit)
            revenue = (withdraw_val // 5000) * 25 + (deposit_val // 5000) * 10
            
            # Operational Cost (Fixed + Health based)
            op_cost = 500 + (100 - health) * 50

            data.append([
                date, atm_id, atm_type, is_weekend, is_payday, is_festival, 
                withdraw_val, deposit_val,
                withdraw_100, withdraw_500, withdraw_2000,
                deposit_100, deposit_500, deposit_2000,
                health, int(revenue), int(op_cost)
            ])

    cols = [
        'Date', 'ATM_ID', 'Location_Type', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 
        'Withdrawals', 'Deposits',
        'W_100', 'W_500', 'W_2000',
        'D_100', 'D_500', 'D_2000',
        'Health', 'Revenue', 'Cost'
    ]
    df = pd.DataFrame(data, columns=cols)
    
    # TARGET VARIABLE: Net Cash Flow
    df['Net_Cash_Flow'] = df['Deposits'] - df['Withdrawals']
    
    return df
