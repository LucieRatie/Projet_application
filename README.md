<<<<<<< HEAD
# Projet_application
=======
# DRAM Pedagogical Assistant Application (Projet Application)

This is the main codebase for the **DRAM Project**, a pedagogical assistant web application designed to support student learning (with a focus on French, Math, and Sciences) while enabling teachers to monitor active chats, manage students, assign sessions, and export transcripts.

---

## Prerequisites

Before setting up the project, make sure you have the following installed on your system:

1. **Node.js**: Version `24` or newer.
   - Check version: `node --version`
2. **pnpm**: The package manager used in this monorepo (version `11.x` is recommended).
   - Check version: `pnpm --version`
   - Install it globally if needed: `npm install -g pnpm`
3. **MongoDB**: A local MongoDB instance running at `mongodb://localhost:27017` or a remote MongoDB connection string.
   - Verify it is running on your machine.

---

## Installation & Setup

1. **Install Dependencies**:
   Navigate to the root directory of the project and run:
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables**:
   In the main application folder `examples/with-ai-sdk-v6/`, create a `.env` or `.env.local` file:
   ```sh
   # (Optional) MongoDB Connection URI - defaults to local if omitted
   MONGODB_URI=mongodb://localhost:27017/dram_project

   # (Optional) Add your AI model provider key if needed (e.g. OpenAI or Ollama provider)
   OPENAI_API_KEY=your-api-key-here
   ```

---

## Running the Application

To start the application, you can either run it from the root directory or navigate into the workspace.

### Option 1: Run from Root (Recommended)
You can launch the dev server directly using `pnpm` filter:
```bash
pnpm --filter with-ai-sdk-v6 dev
```

### Option 2: Run from the example folder
Alternatively, navigate to the folder and run:
```bash
cd examples/with-ai-sdk-v6
pnpm dev
```

The application will be accessible at: **[http://localhost:3000](http://localhost:3000)**.

---

## Seeding the Database (Initial Setup)

To quickly set up the system with mock student profiles, academic levels, and sample chat histories:

1. Make sure your MongoDB instance is running.
2. Start the application (`pnpm dev`).
3. Open your browser and navigate to: **`http://localhost:3000/api/seed`**
4. You should see a JSON response confirming successful seeding:
   ```json
   { "message": "Database seeded successfully with French student data!" }
   ```
5. You can now log in using one of the seeded student IDs (e.g. `JEAN DUPONT` id, or password for the teacher).

---

## Running Tests & Checks

The project includes automated validation checks and test suites:

### 1. Run Type Checks
Verify that all TypeScript code compiles and has correct types across the monorepo:
```bash
pnpm test:types
```

### 2. Run Monorepo Tests
Execute all configured unit/integration tests:
```bash
pnpm test
```

### 3. Code Linting & Formatting
The monorepo uses `oxlint` and `oxfmt` for extremely fast linting and formatting:
- **Lint check**: `pnpm lint`
- **Lint fix**: `pnpm lint:fix`
- **Format check**: `pnpm format`
- **Format fix**: `pnpm format:fix`

---

## Project Architecture & Directory Guide

- **`examples/with-ai-sdk-v6`**: The main pedagogical application code.
  - **`app/student-chat.tsx`**: Student-facing chat interface, custom skills progression tracker, and local real-time database synchronizer.
  - **`app/dashboard/page.tsx`**: Teacher-facing suivi console, live chat viewer (external store runtime with active polling), student profile editor, and session objective generator.
  - **`components/login-page.tsx`**: Dual login screen supporting student ID input and teacher password authentication.
  - **`models/`**: Mongoose models defining schema structures for `Student`, `Session`, and chat `Thread` logs.
>>>>>>> web
