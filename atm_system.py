import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import matplotlib.pyplot as plt
import seaborn as sns

# Set random seed for reproducibility
np.random.seed(42)

# ==========================================
# PHASE 1: SMART DATA GENERATOR
# ==========================================
def generate_atm_data(n_days=365, n_atms=5):
    """
    Generates synthetic ATM data simulating Indian banking patterns.
    Includes 'Deposits' to simulate Cash Recyclers (CRMs).
    """
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

# ==========================================
# PHASE 2: ADVANCED FEATURE ENGINEERING
# ==========================================
def add_advanced_features(df):
    """
    Adds Lag and Rolling features to capture seasonality and trends.
    """
    # Sort to ensure shifts work correctly
    df = df.sort_values(by=['ATM_ID', 'Date'])
    
    # 1. LAG FEATURE: "What was the Net Flow on this day last week?" (Weekly Seasonality)
    df['Net_Flow_Lag_7'] = df.groupby('ATM_ID')['Net_Cash_Flow'].shift(7)
    
    # 2. ROLLING MEAN: "Average Net Flow of last 3 days" (Short-term Trend)
    df['Net_Flow_Rolling_3'] = df.groupby('ATM_ID')['Net_Cash_Flow'].transform(lambda x: x.rolling(window=3).mean())
    
    # Drop NaNs created by shifting (First 7 days will be empty)
    df = df.dropna().reset_index(drop=True)
    
    return df

# ==========================================
# PHASE 3: MODEL TRAINING (XGBoost)
# ==========================================
# 1. Generate and Prepare Data
print("Generating Data...")
raw_df = generate_atm_data()
df = add_advanced_features(raw_df)

# 2. Define Features & Target
features = ['ATM_ID', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 'Net_Flow_Lag_7', 'Net_Flow_Rolling_3']
X = df[features]
y = df['Net_Cash_Flow']

# 3. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

# 4. Train XGBoost Model
print("Training XGBoost Model...")
model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=5)
model.fit(X_train, y_train)

# 5. Evaluate Performance
preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
print(f"Model Training Complete. MAE: ₹{mae:.2f}")

# Feature Importance Check
print("\nTop Predictors:")
print(pd.Series(model.feature_importances_, index=features).sort_values(ascending=False))

# ==========================================
# PHASE 4: THE INNOVATION (OPTIMIZATION ENGINE)
# ==========================================
def run_cash_optimization(date_input, model, df):
    print(f"\n{'='*40}")
    print(f" CASHCYCLE OPTIMIZATION REPORT: {date_input}")
    print(f"{'='*40}")
    
    # For simulation, we grab the latest data points from our test set as 'Yesterday's Data'
    # In a real app, you'd fetch live DB values.
    
    # Create input for 5 ATMs for the 'next day'
    input_data = []
    atm_ids = [0, 1, 2, 3, 4]
    
    for atm in atm_ids:
        # Get the most recent known values for this ATM to build Lag features
        last_7_days = df[df['ATM_ID'] == atm].iloc[-7:] 
        
        lag_7_val = last_7_days['Net_Cash_Flow'].values[0] # Value from 7 days ago
        roll_3_val = last_7_days['Net_Cash_Flow'].tail(3).mean() # Avg of last 3 days
        
        input_data.append({
            'ATM_ID': atm,
            'Is_Weekend': 0,    # Assuming Weekday for demo
            'Is_Payday': 1,     # Assuming it's a Payday (High Stress)
            'Is_Festival': 0,
            'Net_Flow_Lag_7': lag_7_val,
            'Net_Flow_Rolling_3': roll_3_val
        })
    
    # Predict Net Flow
    input_df = pd.DataFrame(input_data)
    predictions = model.predict(input_df)
    
    # --- LOGISTICS ALGORITHM ---
    surplus_atms = [] # Cash Heavy
    deficit_atms = [] # Cash Starved
    
    print("\n[1] NETWORK STATUS PREDICTION:")
    for i, flow in enumerate(predictions):
        status = "SURPLUS (Deposit Heavy)" if flow > 0 else "DEFICIT (Needs Cash)"
        print(f"   ATM {i}: Net Flow Predicted = ₹{int(flow):,} -> {status}")
        
        if flow > 100000: # Threshold for 'Too Much Cash'
            surplus_atms.append({'id': i, 'amount': int(flow)})
        elif flow < -100000: # Threshold for 'Critical Low'
            deficit_atms.append({'id': i, 'amount': int(abs(flow))})

    print("\n[2] OPTIMIZED REBALANCING SCHEDULE:")
    if not deficit_atms:
        print("   ✅ No Critical Deficits. Network is stable.")
    else:
        for def_atm in deficit_atms:
            # Try to find a Surplus ATM to cover this Deficit
            if surplus_atms:
                surplus = surplus_atms[0] # Pick the first available surplus ATM
                transfer_amt = min(surplus['amount'], def_atm['amount'])
                
                print(f"   🚀 INNOVATION ALERT: Transfer ₹{transfer_amt:,} from ATM {surplus['id']} -> ATM {def_atm['id']}")
                print(f"      Result: Saved 1 Vault Trip (CIT Cost Reduction)")
                
                # Update remaining amounts
                surplus['amount'] -= transfer_amt
                def_atm['amount'] -= transfer_amt
                
                # If surplus ATM is drained, remove it from list
                if surplus['amount'] < 50000:
                    surplus_atms.pop(0)
            else:
                print(f"   ⚠️  Standard Action: Send Vault Truck to ATM {def_atm['id']} (No Surplus Available)")

# Run the full simulation
run_cash_optimization("Tomorrow", model, df)