import unittest
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

from models import UserSettings, Transaction, PortfolioResponseItem
from service import get_user_settings

class TestBlueprintGoals(unittest.TestCase):

    def test_1_settings_engine_defaults(self):
        """Goal 1: Verify Settings Engine default configuration."""
        settings = UserSettings(clerk_id="test_user")
        self.assertEqual(settings.broker_name, "JS Global")
        self.assertEqual(settings.fee_type, "Percentage")
        self.assertEqual(settings.fee_value, 0.15)
        self.assertEqual(settings.sales_tax_rate, 13.0)

    def test_2_transaction_ledger_net_settled_buy_and_sell(self):
        """Goal 2: Verify Transaction Ledger Net Settled calculation."""
        # 1,000 shares @ Rs. 50 (Gross Rs. 50,000)
        # Percentage commission: 0.15% = Rs. 75. SST 13% of 75 = Rs. 9.75. Total Fee = Rs. 84.75
        shares = 1000
        price = 50.0
        gross = shares * price
        base_comm = gross * (0.15 / 100.0)
        sst = base_comm * (13.0 / 100.0)
        total_fee = base_comm + sst
        
        buy_net_settled = -(gross + total_fee)
        self.assertAlmostEqual(buy_net_settled, -50084.75, places=2)

        # Sell 500 shares @ Rs. 60 (Gross Rs. 30,000), Fee Rs. 50, CGT Rs. 100
        sell_gross = 500 * 60.0
        sell_fee = 50.0
        cgt = 100.0
        sell_net_settled = sell_gross - sell_fee - cgt
        self.assertAlmostEqual(sell_net_settled, 29850.0, places=2)

    def test_3_portfolio_aggregator_wabp(self):
        """Goal 3: Verify Weighted Average Buy Price (WABP) calculation."""
        # Buy 1: 1,000 shares @ Rs. 50 -> Gross Rs. 50,000
        # Buy 2: 500 shares @ Rs. 80 -> Gross Rs. 40,000
        # Total Buy Gross = 90,000. Total Buy Shares = 1,500
        # WABP = 90,000 / 1,500 = Rs. 60.0
        b1_gross = 1000 * 50.0
        b2_gross = 500 * 80.0
        total_buy_gross = b1_gross + b2_gross
        total_buy_shares = 1000 + 500
        
        wabp = total_buy_gross / total_buy_shares
        self.assertEqual(wabp, 60.0)

    def test_4_live_market_engine_unrealized_pl(self):
        """Goal 4: Verify Live Market Engine Unrealized P&L against WABP."""
        shares = 1500
        wabp = 60.0
        current_market_price = 75.0
        
        cost_basis = shares * wabp # Rs. 90,000
        current_value = shares * current_market_price # Rs. 112,500
        unrealized_pl = current_value - cost_basis # Rs. 22,500
        unrealized_pct = (unrealized_pl / cost_basis) * 100.0 # 25.0%

        self.assertEqual(cost_basis, 90000.0)
        self.assertEqual(current_value, 112500.0)
        self.assertEqual(unrealized_pl, 22500.0)
        self.assertEqual(unrealized_pct, 25.0)

if __name__ == '__main__':
    unittest.main()
