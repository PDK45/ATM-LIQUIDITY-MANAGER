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
            
            data.append([date, atm_id, atm_type, is_weekend, is_payday, is_festival, int(base_withdraw), int(base_deposit)])

    df = pd.DataFrame(data, columns=['Date', 'ATM_ID', 'Location_Type', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 'Withdrawals', 'Deposits'])
    
    # TARGET VARIABLE: Net Cash Flow
    # Positive (+) = Surplus (Too much cash)
    # Negative (-) = Deficit (Needs refill)
    df['Net_Cash_Flow'] = df['Deposits'] - df['Withdrawals']
    
    return df
