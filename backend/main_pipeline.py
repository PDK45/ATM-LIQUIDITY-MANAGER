import sys
import os

# Add src to path
# Add backend to path (so we can import src)
sys.path.append(os.path.dirname(__file__))

from src.data_generator import generate_atm_data
from src.features import add_advanced_features
from src.model_trainer import train_model, save_model
from src.optimizer import predict_next_day

def main():
    print(">>> STARTING ATM FORECASTING PIPELINE <<<")
    
    # 1. Data Generation
    print("\n[1] Generating Synthetic Data...")
    raw_df = generate_atm_data()
    df = add_advanced_features(raw_df)
    print(f"    Generated {len(df)} records.")
    
    # 2. Model Training
    print("\n[2] Training Model...")
    model, mae = train_model(df)
    save_model(model, 'backend/models/xgb_model.json')
    print(f"    Model MAE: {mae:.2f}")
    
    # 3. Optimization Simulation
    print("\n[3] Running Optimization Simulation...")
    results = predict_next_day(model, df)
    
    print("\n    >>> NETWORK STATUS <<<")
    for stat in results['network_status']:
        print(f"    ATM {stat['atm_id']}: {stat['net_flow']} ({stat['status']})")
        
    print("\n    >>> RECOMMENDATIONS <<<")
    if not results['rebalancing_schedule']:
        print("    No actions needed.")
    else:
        for action in results['rebalancing_schedule']:
            print(f"    {action['action']}: {action.get('source')} -> {action.get('destination')} (Amount: {action['amount']})")
            
    print("\n>>> PIPELINE COMPLETE <<<")

if __name__ == "__main__":
    main()
