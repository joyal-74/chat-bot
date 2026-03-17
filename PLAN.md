## ⏱️ Project Execution Plan (5-Hour Timeline)

This document outlines the strategic breakdown of the 5-hour development window to meet all functional and technical requirements.

### Phase 1: Requirement Analysis & Architecture (0:00 - 0:45)
* **Goal:** Deconstruct the prompt and define the tech stack.
* **Actions:**
    * Identified core entities: `Chat` (History) and `Resource` (Infrastructure State).
    * Selected **MERN Stack** (Node/Express/MongoDB) for rapid development and flexible schema handling.
    * Decided on a **Service-Oriented Architecture** to separate LLM logic, Terraform execution, and Database management.
    * Established a "Mocking Strategy" to ensure the app remains testable without AWS/OpenAI keys.

### Phase 2: Database & Server Setup (0:45 - 1:30)
* **Goal:** Build the foundation for data persistence.
* **Actions:**
    * Set up Express server with standard middleware (CORS, JSON parsing).
    * Developed Mongoose schemas for `Chat` and `Resource` collections.
    * Implemented the Router-Controller pattern to keep `app.js` clean.

### Phase 3: LLM Integration & Intent Routing (1:30 - 2:30)
* **Goal:** Enable "Natural Language" understanding.
* **Actions:**
    * Integrated OpenAI SDK with a specialized System Prompt.
    * Designed the JSON response format to extract `action`, `resourceType`, and `params`.
    * Implemented validation logic to detect "Missing Fields" and trigger a follow-up response from the bot.
    * Added logic to distinguish between `CREATE` and `LIST` requests.

### Phase 4: Terraform Service & AWS Bridge (2:30 - 4:00)
* **Goal:** Bridge the gap between Chat and Cloud.
* **Actions:**
    * Developed `generateHCL` to sanitize user inputs and produce valid `.tf` files.
    * Built `executeTerraform` using Node.js `child_process` (`execSync`).
    * Implemented the **Auto-Initialization** logic to run `terraform init` automatically.
    * Added the `-auto-approve` flag for non-interactive `terraform apply` execution.
    * Created the **Mock Execution** toggle to allow for safe testing.

### Phase 5: Integration, Testing & Documentation (4:00 - 5:00)
* **Goal:** Quality assurance and delivery.
* **Actions:**
    * End-to-end testing: Verified the flow from a "Create S3" chat message to a record appearing in MongoDB.
    * Handled edge cases: Added the "Unsupported Resource" guardrail for non-EC2/S3 requests.
    * Finalized documentation: Completed `ANALYSIS.md`, `DB_DESIGN.md`, `RESEARCH_NOTES.md`, and `README.md`.

---

### Key Decision Log
* **Why `execSync`?** Synchronous execution ensured that the Database was only updated *after* a confirmed Terraform success, maintaining data integrity without the complexity of async workers.
* **Why No-Color?** Used the `-no-color` flag in Terraform to ensure that the execution logs stored in MongoDB were clean and readable in the UI/API response.
* **Why Local Temp Folder?** Chose to use a `terraform-temp` directory to isolate infrastructure files from the source code.

---