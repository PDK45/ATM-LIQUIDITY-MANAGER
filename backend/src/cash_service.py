import pandas as pd
import numpy as np
from .simulation_engine import SimulationEngine
from .model_trainer import load_model
from .optimizer import predict_next_day

class CashService:
    def __init__(self):
        self.engine = SimulationEngine()
        
        # Load or Train Model
        model_path = 'backend/models/xgb_model.json'
        try:
            print("Attempting to load XGBoost model...")
            self.model = load_model(model_path)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Model Load Failed: {e}. Retraining on current history...")
            from .model_trainer import train_model, save_model
            self.model, mae = train_model(self.engine.data)
            save_model(self.model, model_path)
        # Default Configuration
        self.config = {
            'risk_tolerance': 'moderate', # aggressive, moderate, conservative
            'min_cash_threshold': 100000,
            'max_cash_threshold': 500000,
            'cost_per_trip': 2000,
            'interest_rate_daily': 0.0002 # ~7% per annum
        }

    def update_config(self, new_config):
        """Updates the operational parameters."""
        print(f"Updating Config: {new_config}")
        self.config.update(new_config)
        
        # Auto-adjust thresholds based on risk profile request if provided
        if 'risk_tolerance' in new_config:
            if new_config['risk_tolerance'] == 'aggressive':
                self.config['min_cash_threshold'] = 50000 
                self.config['max_cash_threshold'] = 300000
            elif new_config['risk_tolerance'] == 'conservative':
                self.config['min_cash_threshold'] = 200000 
                self.config['max_cash_threshold'] = 800000
            else: # moderate
                self.config['min_cash_threshold'] = 100000 
                self.config['max_cash_threshold'] = 500000
        
        return self.config

    def get_status(self):
        """Returns the current network status and history for charts."""
        df = self.engine.data
        latest_day = df['Date'].max()
        today_data = df[df['Date'] == latest_day]
        
        # History for Charts (last 30 days)
        last_30_days = df[df['Date'] > (latest_day - pd.Timedelta(days=30))]
        daily_trends = last_30_days.groupby('Date')['Net_Cash_Flow'].sum().reset_index()
        chart_data = [{'date': str(d.date()), 'net_flow': int(f)} for d, f in zip(daily_trends['Date'], daily_trends['Net_Cash_Flow'])]

        return {
            "date": str(latest_day.date()),
            "total_cash_flow": int(today_data['Net_Cash_Flow'].sum()),
            "chart_data": chart_data,
            "config": self.config
        }

    def get_forecast(self):
        """Runs the optimizer with CURRENT configuration."""
        # Pass dynamic thresholds to optimizer
        return predict_next_day(
            self.model, 
            self.engine.data, 
            min_threshold=self.config['min_cash_threshold'],
            max_threshold=self.config['max_cash_threshold']
        )
    
    def advance_simulation(self):
        return self.engine.advance_day()
    
    def inject_event(self, event_type):
        self.engine.set_next_event(event_type)
        return {"message": f"Event '{event_type}' scheduled for next simulation step."}
    
    def reset_simulation(self):
        self.engine.reset_simulation()

    def get_atm_detail(self, atm_id):
        """Returns detailed data for a specific ATM including history and analytics."""
        df = self.engine.data
        latest_day = df['Date'].max()
        
        # Filter for this ATM
        atm_data = df[df['ATM_ID'] == atm_id].copy()
        
        if atm_data.empty:
            return {"error": "ATM not found"}
        
        # Latest state
        latest = atm_data[atm_data['Date'] == latest_day].iloc[0]
        
        # History for Charts (last 30 days)
        last_30_days = atm_data[atm_data['Date'] > (latest_day - pd.Timedelta(days=30))].sort_values('Date')
        
        # Format transaction history
        transaction_history = []
        for _, row in last_30_days.iterrows():
            transaction_history.append({
                "date": str(row['Date'].date()),
                "withdrawals": int(row['Withdrawals']),
                "deposits": int(row['Deposits']),
                "net_flow": int(row['Net_Cash_Flow'])
            })
            
        # Analytics
        avg_daily_flow = int(last_30_days['Net_Cash_Flow'].mean())
        total_volume = int(last_30_days['Withdrawals'].sum() + last_30_days['Deposits'].sum())
        
        # Financials
        total_revenue = int(last_30_days['Revenue'].sum())
        total_cost = int(last_30_days['Cost'].sum())
        roi = round(((total_revenue - total_cost) / total_cost) * 100, 1) if total_cost > 0 else 0

        # Denomination Mix (Latest)
        denom_mix = [
            {"name": "₹100", "value": int(latest['W_100'] + latest['D_100'])},
            {"name": "₹500", "value": int(latest['W_500'] + latest['D_500'])},
            {"name": "₹2000", "value": int(latest['W_2000'] + latest['D_2000'])}
        ]

        # Financial Trend for charts
        financial_history = []
        for _, row in last_30_days.iterrows():
            financial_history.append({
                "date": str(row['Date'].date()),
                "revenue": int(row['Revenue']),
                "cost": int(row['Cost'])
            })

        # Identify "Refill" events
        refills = []
        possible_refills = atm_data[atm_data['Net_Cash_Flow'] > 200000]
        for _, row in possible_refills.tail(5).iterrows():
            refills.append({
                "date": str(row['Date'].date()),
                "amount": int(row['Net_Cash_Flow']),
                "type": "Refill" 
            })

        # Derive status from health
        h = latest['Health']
        status_str = "OK" if h > 80 else "Caution" if h > 50 else "Critical"

        return {
            "atm_id": int(atm_id),
            "location_type": str(latest['Location_Type']),
            "status": status_str,
            "health": round(float(latest['Health']), 1),
            "current_net_flow": int(latest['Net_Cash_Flow']),
            "avg_daily_flow": avg_daily_flow,
            "total_30d_volume": total_volume,
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "roi": roi,
            "denom_mix": denom_mix,
            "transaction_history": transaction_history,
            "financial_history": financial_history,
            "refill_history": refills
        }
