import pandas as pd
import numpy as np

def run_optimization_logic(predictions, atm_ids, min_threshold=100000, max_threshold=100000):
    """
    Runs the logistics algorithm to determine rebalancing actions.
    Returns structured data for the API/Dashboard.
    """
    surplus_atms = [] # Cash Heavy
    deficit_atms = [] # Cash Starved
    results = {
        "network_status": [],
        "rebalancing_schedule": []
    }
    
    # 1. NETWORK STATUS
    for i, flow in enumerate(predictions):
        status = "STABLE"
        
        if flow > max_threshold: # Too Much Cash
            status = "SURPLUS"
            surplus_atms.append({'id': atm_ids[i], 'amount': int(flow)})
        elif flow < -min_threshold: # Critical Low
            status = "DEFICIT"
            deficit_atms.append({'id': atm_ids[i], 'amount': int(abs(flow))})
            
        results["network_status"].append({
            "atm_id": atm_ids[i],
            "net_flow": int(flow),
            "status": status
        })

    # 2. OPTIMIZED REBALANCING (Greedy Algorithm)
    if not deficit_atms:
        pass # No critical deficits
    else:
        for def_atm in deficit_atms:
            if surplus_atms:
                surplus = surplus_atms[0] # Pick the first available surplus ATM
                transfer_amt = min(surplus['amount'], def_atm['amount'])
                
                results["rebalancing_schedule"].append({
                    "action": "INTER_ATM_TRANSFER",
                    "source": surplus['id'],
                    "destination": def_atm['id'],
                    "amount": transfer_amt,
                    "notes": "Saved 1 Vault Trip"
                })
                
                # Update remaining amounts
                surplus['amount'] -= transfer_amt
                def_atm['amount'] -= transfer_amt
                
                # If surplus ATM is drained, remove it from list
                if surplus['amount'] < 50000:
                    surplus_atms.pop(0)
            else:
                results["rebalancing_schedule"].append({
                    "action": "VAULT_REFILL",
                    "source": "CENTRAL_VAULT",
                    "destination": def_atm['id'],
                    "amount": def_atm['amount'],
                    "notes": "Standard Refill"
                })
                
    return results

def predict_next_day(model, df, min_threshold=100000, max_threshold=500000):
    """
    Simulates input for the next day based on the latest data in df.
    """
    input_data = []
    atm_ids = [0, 1, 2, 3, 4]
    
    for atm in atm_ids:
        # Get the most recent known values for this ATM to build Lag features
        last_7_days = df[df['ATM_ID'] == atm].iloc[-7:] 
        
        if len(last_7_days) < 7:
             lag_7_val = 0
             roll_3_val = 0
        else:
            lag_7_val = last_7_days['Net_Cash_Flow'].values[0]
            roll_3_val = last_7_days['Net_Cash_Flow'].tail(3).mean()
        
        input_data.append({
            'ATM_ID': atm,
            'Is_Weekend': 0,    # Assuming Weekday for demo
            'Is_Payday': 1,     # Assuming it's a Payday
            'Is_Festival': 0,
            'Net_Flow_Lag_7': lag_7_val,
            'Net_Flow_Rolling_3': roll_3_val
        })
    
    input_df = pd.DataFrame(input_data)
    # Reorder columns to match training
    features = ['ATM_ID', 'Is_Weekend', 'Is_Payday', 'Is_Festival', 'Net_Flow_Lag_7', 'Net_Flow_Rolling_3']
    predictions = model.predict(input_df[features])
    
    return run_optimization_logic(predictions, atm_ids, min_threshold, max_threshold)
