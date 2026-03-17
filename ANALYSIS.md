## 🔍 ANALYSIS

### 1. Problem Understanding
The goal is to bridge the gap between **Natural Language (Human)** and **HCL/Terraform (Machine)**. 

Users shouldn't need to know how to write code to provision infrastructure. The system must act as a translator that:
1.  Identifies **Intent** (Create vs. List vs. Unsupported).
2.  Extracts **Entities** (Instance Type, Bucket Name, Region).
3.  Handles **State** (Remembering what was asked in a multi-turn conversation).
4.  Provides **Safety** (Validating code before execution).

### 2. Proposed Architecture & Workflow
The system follows a "Linear Pipeline" for every message received:

* **Input**: User says "I need an EC2."
* **NLP Layer**: LLM parses the string. If "Name" or "Region" is missing, the LLM flags `status: "INCOMPLETE"`.
* **Logic Layer**: 
    * If **Incomplete**: Backend stores the partial data in MongoDB and asks the user for the missing piece.
    * If **Complete**: Backend triggers the `Terraform Generator` service.
* **IaC Layer**: A temporary directory is created; `main.tf` is written; `terraform plan` is executed.
* **Persistence**: Once "Planned," the metadata (Resource ID, Type, Status) is saved to the `Resources` collection.
* **Output**: User receives a success message or a list of resources fetched from the DB.

### 3. Key Assumptions
* **Mock Execution**: For the 5-hour scope, `terraform apply` (actual deployment to AWS) is mocked or limited to `terraform plan` to avoid AWS credential issues and costs.
* **Scope Limitation**: Only `t2.micro` instances and standard S3 buckets are supported to keep the LLM prompts deterministic and the Terraform templates simple.
* **Single User**: The MVP assumes a single-user session for simplicity in state management, though the DB schema is designed to support `userId` for future scaling.

### 4. Decision Making (The "5-Hour" Strategy)
| Feature | Decision | Reasoning |
| :--- | :--- | :--- |
| **Language** | Node.js (Express) | High velocity for JSON-based APIs and excellent async handling for CLI commands. |
| **LLM** | OpenAI (GPT-4o/3.5) | Best-in-class for structured JSON output, reducing the need for complex regex parsing. |
| **Validation** | `terraform validate` | Faster than a full `plan` and ensures the generated HCL won't crash a real environment. |
| **State** | MongoDB | Flexible schema allows us to store varying "Collected Variables" for different AWS resources without migrations. |

### 5. Potential Risks & Mitigations
* **Risk**: LLM hallucinating invalid Terraform syntax.
    * **Mitigation**: Use strict "System Prompting" and run `terraform validate` as a mandatory gatekeeper before showing the user a success message.
* **Risk**: Resource Naming conflicts (S3 buckets must be globally unique).
    * **Mitigation**: The backend will append a short UUID to bucket names if the LLM-generated name fails validation.

---