
## 🧪 RESEARCH NOTES

### 1. Learning Terraform (The "How-To")
**Goal:** How to automate resource creation without manually clicking the AWS Console.
* **Core Concept**: Terraform uses HCL (HashiCorp Configuration Language). To automate it via a Chatbot, the backend must act as a "File Writer."
* **Key Commands**:
    * `terraform init`: Prepared the working directory.
    * `terraform validate`: Checks if the generated code is syntactically correct.
    * `terraform plan`: Shows what will be created without actually spending money/deploying.
* **Automation Strategy**: Use Node.js `fs` module to write `main.tf` and `child_process` to execute CLI commands.

### 2. LLM Integration Strategy
**Goal:** Transform "I want a server" into `{ "resource": "ec2", "action": "create" }`.
* **Prompt Engineering**: I used a **System Prompt** to force the LLM to return JSON only. This prevents the bot from "chatting" too much and allows the backend to parse the logic easily.
* **Constraint Handling**: If the user asks for "SQS", the LLM is instructed to flag an `unsupported_resource` error.
* **Tooling**: Explored OpenAI's `gpt-3.5-turbo` or `gpt-4o` for their high reasoning capabilities regarding code generation.

### 3. Database & State Management
**Goal:** How to remember that the user is *in the middle* of creating an EC2.
* **Session Logic**: MongoDB stores a `conversation` thread. If a required variable (like `region`) is null, the backend looks at the last DB entry and prompts the user specifically for that value.
* **Resource Mapping**: Instead of querying AWS directly (which is slow/expensive), we query the local MongoDB "Resources" collection to "List my servers."

### 4. Challenges & Workarounds
* **Challenge**: Running Terraform in a multi-user environment.
    * *Solution*: For this MVP, each request generates a unique folder (UUID) to prevent one user's `.tf` file from overwriting another's.
* **Challenge**: Security.
    * *Solution*: Hard-coded the LLM to only allow `t2.micro` instances to prevent accidental high-cost resource generation during testing.

---