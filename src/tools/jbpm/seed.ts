import Persistence from './Persistence.js';
import ConfigManager from './ConfigManager.js';

/**
 * jBPM Identity Sealer & Seeder
 * Creates standard jBPM roles, groups, and test users.
 */
export async function seedIdentity(persistence: any) {
  console.log('\n--- Zero-BPM Identity Seeding: Phase 1 (Groups) ---');
  const groups = [
    { name: 'HR', desc: 'Human Resources & Onboarding' },
    { name: 'IT', desc: 'Infrastructure & Support' },
    { name: 'FINANCE', desc: 'Accounting & Payroll' },
    { name: 'MANAGERS', desc: 'Executive Approval Group' }
  ];

  for (const g of groups) {
    await persistence.createGroup(g.name, g.desc);
    console.log(`[SEED] Group created: ${g.name}`);
  }

  console.log('\n--- Zero-BPM Identity Seeding: Phase 2 (Users) ---');
  const testUsers = [
    { user: 'admin', pass: 'admin123', role: 'admin', fullName: 'System Administrator', group: 'IT' },
    { user: 'analyst', pass: 'analyst123', role: 'analyst', fullName: 'Business Analyst', group: 'FINANCE' },
    { user: 'developer', pass: 'dev123', role: 'developer', fullName: 'Full Stack Developer', group: 'IT' },
    { user: 'manager', pass: 'manager123', role: 'manager', fullName: 'Department Manager', group: 'MANAGERS' },
    { user: 'staff', pass: 'staff123', role: 'user', fullName: 'General Staff', group: 'HR' }
  ];

  for (const u of testUsers) {
    await persistence.createUser(u.user, u.pass, u.role, u.fullName);
    await persistence.addUserToGroup(u.user, u.group);
    
    // Admins are in MANAGERS too
    if (u.role === 'admin') {
      await persistence.addUserToGroup(u.user, 'MANAGERS');
    }
    
    console.log(`[SEED] User created: ${u.user} (${u.role}) -> ${u.group}`);
  }

  console.log('\n[SUCCESS] Identity seeding complete. System ready for RBAC testing.');
}
