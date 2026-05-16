import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )
        context = await browser.new_context()
        context.set_default_timeout(15000)
        page = await context.new_page()
        # -> navigate
        await page.goto("http://localhost:3456")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the Parties page by clicking the 'Parties' button.
        # button "Parties" aria-label="Parties"
        elem = page.locator("xpath=/html/body/div[2]/nav/button[5]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Click the 'Parties' button to open the Parties page and wait for the page to load so the party list is visible.
        # button "Parties" aria-label="Parties"
        elem = page.locator("xpath=/html/body/div[2]/nav/button[5]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Open the Parties page by clicking the 'Parties' button and wait for the page to load so the party list is visible.
        # button "Parties" aria-label="Parties"
        elem = page.locator("xpath=/html/body/div[2]/nav/button[5]").nth(0)
        await elem.wait_for(state="visible", timeout=10000)
        await elem.click()
        
        # -> Final action — this is where the agent failed
        # Error observed by agent: Navigation failed - site unavailable: http://localhost:3456/parties
        await page.goto("http://localhost:3456/parties")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Test blocked (AST guard fallback)
        raise AssertionError("Test blocked during agent run: " + "TEST BLOCKED The Parties page could not be reached \u2014 the local server is not responding, preventing the test from running. Observations: - Navigating to http://localhost:3456/parties produced a browser error page: 'This page isn't working' and ERR_EMPTY_RESPONSE. - The page contains only a 'Reload' button and no party list, ledger, or transaction UI elements were present.")
        await asyncio.sleep(5)
    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    