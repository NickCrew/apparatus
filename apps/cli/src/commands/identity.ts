/**
 * Identity Commands
 * JWKS, OIDC, tokens, JWT debugging
 */

import type { Command } from 'commander';
import type { ApparatusClient } from '@apparatus/client';
import chalk from 'chalk';
import { z } from 'zod';
import * as output from '../output.js';

export function registerIdentityCommands(program: Command, getClient: () => ApparatusClient): void {
  const identity = program
    .command('identity')
    .description('Identity - JWKS, OIDC, tokens, JWT');

  identity
    .command('jwks')
    .description('Get JSON Web Key Set')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching JWKS...');
      spin.start();

      try {
        const result = await client.identity.jwks();
        spin.stop();

        output.header(`JWKS (${result.keys.length} keys)`);
        for (const key of result.keys) {
          output.subheader(`\nKey: ${key.kid || 'unnamed'}`);
          output.printKeyValue({
            Type: key.kty,
            Use: key.use || 'unspecified',
            Algorithm: key.alg || 'unspecified',
          });
        }
      } catch (err) {
        spin.stop();
        output.error(`JWKS fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('oidc')
    .description('Get OpenID Connect configuration')
    .action(async () => {
      const client = getClient();
      const spin = output.spinner('Fetching OIDC config...');
      spin.start();

      try {
        const result = await client.identity.oidc();
        spin.stop();

        output.header('OpenID Connect Configuration');
        output.printKeyValue({
          Issuer: result.issuer,
          'Authorization Endpoint': result.authorization_endpoint,
          'Token Endpoint': result.token_endpoint,
          'JWKS URI': result.jwks_uri,
        });

        output.subheader('\nSupported:');
        output.printKeyValue({
          'Response Types': result.response_types_supported.join(', '),
          'Subject Types': result.subject_types_supported.join(', '),
          'ID Token Signing': result.id_token_signing_alg_values_supported.join(', '),
        });
      } catch (err) {
        spin.stop();
        output.error(`OIDC fetch failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('token')
    .description('Mint a new token')
    .option('-s, --subject <sub>', 'Token subject')
    .option('-a, --audience <aud>', 'Token audience')
    .option('-e, --expires <time>', 'Expiration time (e.g., "1h", "30m")')
    .option('-c, --claims <json>', 'Additional claims as JSON')
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Minting token...');
      spin.start();

      try {
        const result = await client.identity.mintToken({
          subject: options.subject,
          audience: options.audience,
          expiresIn: options.expires,
          claims: options.claims ? JSON.parse(options.claims) : undefined,
        });
        spin.stop();

        output.header('Token Minted');
        output.printKeyValue({
          'Token Type': result.token_type,
          'Expires In': `${result.expires_in}s`,
          Scope: result.scope || 'none',
        });

        output.subheader('\nAccess Token:');
        console.log(chalk.cyan(result.access_token));
      } catch (err) {
        spin.stop();
        output.error(`Token minting failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('decode <token>')
    .alias('jwt')
    .description('Decode and validate a JWT token')
    .action(async (token) => {
      const client = getClient();
      const spin = output.spinner('Decoding token...');
      spin.start();

      try {
        const result = await client.identity.decodeJwt(token);
        spin.stop();

        output.header('JWT Decoded');
        output.printKeyValue({
          Valid: result.valid ? chalk.green('yes') : chalk.red('no'),
        });

        if (result.error) {
          output.error(`Validation error: ${result.error}`);
        }

        output.subheader('\nHeader:');
        output.printJson(result.header);

        output.subheader('\nPayload:');
        output.printJson(result.payload);
      } catch (err) {
        spin.stop();
        output.error(`Token decode failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  identity
    .command('validate <token>')
    .description('Validate a JWT token (returns exit code)')
    .action(async (token) => {
      const client = getClient();
      try {
        const valid = await client.identity.validateJwt(token);
        if (valid) {
          output.success('Token is valid');
        } else {
          output.error('Token is invalid');
          process.exit(1);
        }
      } catch (err) {
        output.error(`Validation failed: ${(err as Error).message}`);
        process.exit(1);
      }
    });

  // Schema for validating custom claims
  const claimsSchema = z.record(z.string(), z.unknown());

  identity
    .command('forge')
    .description('Forge a malicious JWT token for security testing')
    .option('-s, --sub <subject>', 'Subject claim')
    .option('-a, --aud <audience>', 'Audience claim')
    .option('-e, --exp <seconds>', 'Expiration time in seconds (default: 3600)')
    .option('-c, --claims <json>', 'Custom claims as JSON object')
    .option('--alg <algorithm>', 'Algorithm (default: HS256)', 'HS256')
    .option('--admin', 'Add admin role claim')
    .option('--elevated', 'Add elevated privileges claim')
    .option('--output <file>', 'Write token to file instead of stdout')
    .option('--json', 'Output as JSON only (suppress warnings)')
    .addHelpText('after', `
Examples:
  $ apparatus identity forge --sub attacker --aud myapp
  $ apparatus identity forge --sub admin --admin --elevated
  $ apparatus identity forge --claims '{"role":"admin","org":"hack"}'

SECURITY WARNING: Forged tokens are for authorized security testing only.
Misuse of this command may be illegal. Only use in authorized environments.`)
    .action(async (options) => {
      const client = getClient();
      const spin = output.spinner('Forging JWT token...');
      spin.start();

      try {
        // Parse and validate custom claims
        let claims: Record<string, unknown> = {};
        if (options.claims) {
          try {
            const parsed = JSON.parse(options.claims);
            claims = claimsSchema.parse(parsed);
          } catch (err) {
            spin.stop();
            if (err instanceof z.ZodError) {
              output.error(`Invalid claims format: ${err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
            } else if (err instanceof SyntaxError) {
              output.error(`Invalid JSON in --claims: ${err.message}`);
            } else {
              output.error(`Failed to parse claims: ${(err as Error).message}`);
            }
            process.exit(1);
          }
        }

        // Validate subject is provided
        if (!options.sub && !options.admin) {
          spin.stop();
          output.error('Subject (--sub) must be specified or use --admin flag');
          process.exit(1);
        }

        // Add role/privilege claims
        if (options.admin) claims.role = 'admin';
        if (options.elevated) claims.privileges = 'elevated';

        const res = await fetch(`${client.getBaseUrl()}/auth/forge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sub: options.sub || 'attacker',
            aud: options.aud,
            exp: Math.floor(Date.now() / 1000) + (parseInt(options.exp) || 3600),
            alg: options.alg,
            claims,
          }),
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const result = await res.json() as { token: string; decoded?: Record<string, unknown> };

        spin.stop();

        if (options.json) {
          output.outputJson({ token: result.token, decoded: result.decoded });
        } else {
          output.header('Forged JWT Token');
          output.warning('⚠️  SECURITY WARNING: This token is for authorized testing only');
          output.warning('⚠️  Misuse may be illegal. Only use in authorized environments.');

          if (options.output) {
            const fs = await import('fs/promises');
            await fs.writeFile(options.output, result.token, 'utf-8');
            output.success(`Token written to: ${options.output}`);
            output.info('Keep this file secure and do not commit to version control');
          } else {
            output.subheader('\nToken:');
            console.log(chalk.cyan(result.token));
            output.info('Use this token in the Authorization header: Bearer <token>');
            output.warning('⚠️  Token displayed in plaintext. Ensure terminal history is secure.');
          }

          if (result.decoded) {
            output.subheader('\nDecoded Payload:');
            output.printJson(result.decoded);
          }
        }
      } catch (err) {
        spin.stop();
        output.handleError(err, 'Token forging failed');
      }
    });
}
