# Security

## Reporting a vulnerability

Email **arista.indrajaya@gmail.com** with a description, the affected route or file, and steps to
reproduce. Please do not open a public issue for a vulnerability.

Only the `main` branch and the production deployment at `https://eduujoy.aindrajaya.my.id` are
supported.

## Incident note: PolinRider supply-chain compromise (October 2026)

In October 2026 the maintainer's development workstation was compromised by the PolinRider
campaign, which injects an obfuscated JavaScript loader (a BeaverTail variant) into build
configuration files and pushes it with rewritten history. This repository was one of those
affected, and it appears in OpenSourceMalware's public tracking of the campaign.

### What happened in this repository

- One commit on `main`, the merge of pull request #3, was rewritten by the malware. It appended the
  loader to `postcss.config.mjs` and changed `.gitignore`: the `.env*` rule was removed and four
  entries for the malware's own files were added.
- The loader runs in Node when the project is built or served in development. It is not part of
  the browser bundle.
- No `.env` file was ever committed, in that commit or any other.
- The payload was removed on 21 October 2026 together with a first scanning workflow;
  `polinrider-guard` followed the next day.

### Why the commit hashes changed on 20 November 2026

Removing the payload with a new commit left it readable in the old one. On 20 November 2026 this
repository was republished with a rewritten history:

- In the affected commit, `postcss.config.mjs` and `.gitignore` were restored to the content of
  the parent commit. Nothing else was changed.
- Every branch has the same number of commits, the same messages, authors and dates, and the same
  final file contents as before.
- Every commit hash is different, and signatures on the rewritten commits were lost.
- The original repository is archived privately. Pull request discussions #1 to #15 remain there;
  the merge commits of the merged ones are in this history.

The affected commit in the old history was `9ad74ef04ad23a81e5baedbb18f8747551cee333`. If you have
a clone made before 20 November 2026, delete it and clone again. Do not install or build from that
commit.

### What was done

- The affected workstation was wiped and reinstalled.
- GitHub credentials, cloud service keys and third-party API keys were rotated.
- The history of this repository and of
  [aindrajaya/eduujoy-api](https://github.com/aindrajaya/eduujoy-api) was scanned in full.

### What prevents a repeat

- **`polinrider-guard`** scans git objects for the campaign's indicators on every push and pull
  request, and weekly across all branches. It reads objects only and never runs repository code.
- **`security-scan`** statically scans tracked files for hidden or obfuscated code.
- **Branch rules on `main`**: signed commits only, no force-push, no deletion, and CI and both
  scans must pass before a merge.
- **Supply-chain settings**: frozen lockfile, dependency install scripts off by default, a
  seven-day minimum release age for packages, and third-party actions pinned to commit hashes. The
  README's "Supply chain" section has the details.
