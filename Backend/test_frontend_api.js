const axios = require("axios");

async function test() {
  const email = `test_${Date.now()}@example.com`;
  const password = "Password123!";
  const username = `user_${Date.now()}`;

  // 1. Register
  console.log("Attempting registration with:", { username, email, password });
  try {
    const regRes = await axios.post("http://localhost:3000/api/auth/register", {
      username,
      email,
      password
    });
    console.log("Registration response status:", regRes.status);
    console.log("Registration response data:", regRes.data);
    const cookie = regRes.headers["set-cookie"];
    console.log("Set-Cookie from registration:", cookie);
  } catch (err) {
    console.error("Registration failed:", err.response ? err.response.data : err.message);
    return;
  }

  // 2. Login
  console.log("\nAttempting login with:", { email, password });
  try {
    const loginRes = await axios.post("http://localhost:3000/api/auth/login", {
      email,
      password
    });
    console.log("Login response status:", loginRes.status);
    console.log("Login response data:", loginRes.data);
    const cookie = loginRes.headers["set-cookie"];
    console.log("Set-Cookie from login:", cookie);
  } catch (err) {
    console.error("Login failed:", err.response ? err.response.data : err.message);
  }
}

test();
