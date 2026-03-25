const { Builder, By, until } = require("selenium-webdriver");

describe("Home Page", () => {
  let driver = new Builder().forBrowser("chrome").build();;

  afterAll(async () => {
    await driver.quit();
  });

  test("Load the page", async () => {
    await driver.get("http://localhost:5173");

    // Wait up to 10s for the logo div to appear
    const logo = await driver.wait(
      until.elementLocated(By.className("a4a-logo")),
      10000
    );

    const text = await logo.getText();
    expect(text).toBe("All4All");
  }, 30000); // 30s Jest timeout for this test

  // tests the create account button on the sign-in tab
  test("Create Account Switch", async () => {
    await driver.get("http://localhost:5173");

    // Wait for the switch buttons to appear
    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );

    await buttons[0].click();

      // Assert the "Join as Volunteer" tab button now has the active class
    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );
    expect(await activeTab.getText()).toBe("Join as Volunteer");

  }, 30000);

  // tests the "please fill in all fields" appears when the username or password fields are blank
  test("Not Enough Provided Sign In", async () => {
    await driver.get("http://localhost:5173");

    // Wait for the switch buttons to appear
    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-btn")),
      10000
    );

    await buttons[0].click();

     // Wait for the error message to appear and assert
    const error = await driver.wait(
      until.elementLocated(By.className("a4a-err")),
      10000
    );

    expect(await error.getText()).toBe("Please fill in all fields.");

  }, 30000);

  // on the volunteers page, clicking to switch over to the organizations page
   test("Organization Switch", async () => {
    await driver.get("http://localhost:5173");

    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Join as Volunteer']")),
      10000
    );
    await tab.click();

    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );

    await buttons[0].click();

      // Assert the "Register Org" tab button now has the active class
    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );
    expect(await activeTab.getText()).toBe("Register Org");

  }, 30000);

  test("Org to Volunteer Switch", async () => {
    await driver.get("http://localhost:5173");

    const tab = await driver.wait(
      until.elementLocated(By.xpath("//button[text()='Register Org']")),
      10000
    );
    await tab.click();

    const buttons = await driver.wait(
      until.elementsLocated(By.className("a4a-switch-btn")),
      10000
    );

    await buttons[0].click();

      // Assert the "Register Org" tab button now has the active class
    const activeTab = await driver.wait(
      until.elementLocated(By.css(".a4a-tab.active")),
      10000
    );
    expect(await activeTab.getText()).toBe("Join as Volunteer");

  }, 30000);
});