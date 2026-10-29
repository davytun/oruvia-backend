import readline from 'node:readline';
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { validateEnv } from '../../../config/env.validation.js';
import { buildDataSourceOptions } from '../../../database/database.config.js';
import { AdminUser } from '../entities/admin-user.entity.js';
import { AdminVerificationCode } from '../entities/admin-verification-code.entity.js';

function askQuestion(query: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden && process.stdin.isTTY) {
      // In interactive terminal, mask the input
      process.stdout.write(query);
      const stdin = process.stdin;
      const oldRaw = stdin.isRaw;
      stdin.setRawMode?.(true);
      stdin.resume();

      let input = '';
      const onData = (char: Buffer) => {
        const str = char.toString();
        if (str === '\n' || str === '\r' || str === '\u0004') {
          stdin.setRawMode?.(oldRaw ?? false);
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (str === '\u0008' || str === '\x7f') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
          }
        } else if (str === '\u0003') {
          // Ctrl+C
          process.exit(1);
        } else {
          input += str;
        }
      };

      stdin.on('data', onData);
    } else {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

export async function bootstrapAdmin(): Promise<void> {
  // Disallow passing passwords via command line arguments for security
  const args = process.argv.slice(2);
  const passwordArg = args.find((arg) => arg.toLowerCase().includes('password'));
  if (passwordArg) {
    console.error(
      'Security error: Passing passwords as command-line arguments is strictly prohibited.',
    );
    console.error(
      'Please use interactive prompt or ADMIN_BOOTSTRAP_PASSWORD environment variable instead.',
    );
    process.exit(1);
  }

  let fullName = process.env.ADMIN_BOOTSTRAP_FULL_NAME?.trim();
  if (!fullName) {
    fullName = await askQuestion('Admin Full Name: ');
  }

  if (!fullName || fullName.length < 2) {
    console.error('Error: Admin full name must be at least 2 characters.');
    process.exit(1);
  }

  let email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (!email) {
    email = (await askQuestion('Admin Email: ')).toLowerCase();
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    console.error('Error: A valid email address is required.');
    process.exit(1);
  }

  let password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password) {
    password = await askQuestion('Admin Password (min 8 chars): ', true);
  }

  if (!password || password.length < 8) {
    console.error('Error: Admin password must be at least 8 characters.');
    process.exit(1);
  }

  const env = validateEnv(process.env);
  const dataSourceOptions = buildDataSourceOptions(env);
  const dataSource = new DataSource({
    ...dataSourceOptions,
    entities: [AdminUser, AdminVerificationCode],
  });

  await dataSource.initialize();

  try {
    const adminRepo = dataSource.getRepository(AdminUser);

    // Prevent accidental duplicate bootstrap creation
    const existingAdminCount = await adminRepo.count();
    const allowMultiple = process.env.ALLOW_MULTIPLE_ADMIN_BOOTSTRAP === 'true';

    if (existingAdminCount > 0 && !allowMultiple) {
      console.error(
        'Safeguard error: An initial administrator account already exists.',
      );
      console.error(
        'To provision additional administrators, set ALLOW_MULTIPLE_ADMIN_BOOTSTRAP=true or use internal administration tooling.',
      );
      process.exit(1);
    }

    const existingEmail = await adminRepo.findOne({ where: { email } });
    if (existingEmail) {
      console.error(
        `Safeguard error: An administrator with email "${email}" already exists.`,
      );
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = adminRepo.create({
      fullName,
      email,
      passwordHash,
      status: 'ACTIVE',
      tokenVersion: 0,
      lastLoginAt: null,
    });

    const saved = await adminRepo.save(newAdmin);

    console.log(
      `Administrator account successfully provisioned for: ${saved.email} (ID: ${saved.id})`,
    );
  } finally {
    await dataSource.destroy();
  }
}

// Execute directly if run as main script
if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('bootstrap-admin.ts') ||
  process.argv[1]?.endsWith('bootstrap-admin.js')
) {
  bootstrapAdmin().catch((err) => {
    console.error('Bootstrap failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
