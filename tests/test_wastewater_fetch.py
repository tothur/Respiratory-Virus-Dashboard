import unittest

from wastewater_fetch import parse_wastewater_html


class WastewaterParserTests(unittest.TestCase):
    def test_parses_localized_national_concentrations(self) -> None:
        html = """
        <h1>Szennyvíz jelentés 2026-09-03</h1>
        <table>
          <tr><th>Hét</th><th>Influenza A koncentráció</th><th>Influenza B koncentráció</th></tr>
          <tr><td>2026. 35. hét</td><td>1714,29</td><td>1 894,35</td></tr>
          <tr><td>2026. 36. hét</td><td>1714,29</td><td>1 777,06</td></tr>
        </table>
        <table>
          <tr><th>Hét</th><th>SARS-CoV-2 koncentráció</th></tr>
          <tr><td>2026. 36. hét</td><td>11&nbsp;475,28</td></tr>
        </table>
        <table>
          <tr><th>Hét</th><th>RSV koncentráció</th></tr>
          <tr><td>2026. 36. hét</td><td>2017,08</td></tr>
        </table>
        """

        payload = parse_wastewater_html(html)

        self.assertEqual(payload["source_updated_at"], "2026-09-03")
        self.assertEqual(payload["latest_year"], 2026)
        self.assertEqual(payload["latest_week"], 36)
        self.assertEqual(len(payload["national"]), 6)
        sars = next(row for row in payload["national"] if row["virus"] == "SARS-CoV-2")
        self.assertEqual(sars["concentration"], 11475.28)
        self.assertTrue(payload["provisional"])

    def test_rejects_pages_without_supported_tables(self) -> None:
        with self.assertRaisesRegex(ValueError, "No national wastewater"):
            parse_wastewater_html("<html><body>No data</body></html>")

    def test_parses_nngyk_design_system_table_elements(self) -> None:
        html = """
        <dap-ds-typography>Szennyvíz jelentés</dap-ds-typography><span>2026-09-03</span>
        <dap-ds-table>
          <dap-ds-table-row>
            <dap-ds-table-header>Hét</dap-ds-table-header>
            <dap-ds-table-header>RSV koncentráció</dap-ds-table-header>
          </dap-ds-table-row>
          <dap-ds-table-row>
            <dap-ds-table-cell>2026. 36. hét</dap-ds-table-cell>
            <dap-ds-table-cell>2017,08</dap-ds-table-cell>
          </dap-ds-table-row>
        </dap-ds-table>
        """

        payload = parse_wastewater_html(html)

        self.assertEqual(payload["source_updated_at"], "2026-09-03")
        self.assertEqual(payload["national"][0]["concentration"], 2017.08)


if __name__ == "__main__":
    unittest.main()
