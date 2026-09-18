async function checkRemote() {
  console.log("Checking /api/admin/login...");
  const resAdmin = await fetch('https://lumilove.r9653876.workers.dev/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sreemanthking123@gmail.com', password: 'wrongpassword' })
  });
  const dataAdmin = await resAdmin.json();
  console.log("Admin login response for wrong password:", resAdmin.status, dataAdmin);

  console.log("Checking /api/auth/login...");
  const resAuth = await fetch('https://lumilove.r9653876.workers.dev/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sreemanthking123@gmail.com', password: 'wrongpassword' })
  });
  const dataAuth = await resAuth.json();
  console.log("Auth login response for wrong password:", resAuth.status, dataAuth);
}
checkRemote();
