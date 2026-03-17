## 🗄️ Database Design Documentation

### Overview
For this project, I chose **MongoDB** due to its flexible document-based structure. This allows us to store varying metadata for different AWS resources (e.g., EC2 instances have `instance_type` while S3 buckets have `bucket_name`) without the need for complex table joins.

---

### 1. Collections & Schema Logic

#### **A. Chat Collection (`chats`)**
This collection stores the raw conversation history. It is essential for "Request Tracking" and provides the potential for the LLM to understand context in multi-turn conversations.

| Field | Type | Description |
| :--- | :--- | :--- |
| `role` | String | Either `user` or `assistant`. |
| `content` | String | The actual text message sent or received. |
| `timestamp` | Date | Automatically tracks when the message was sent. |

**Reasoning:** Storing the chat history fulfills the requirement for "Chat History" and allows us to audit what the user requested vs. what the bot understood.

---

#### **B. Resource Collection (`resources`)**
This is the "Source of Truth" for all infrastructure managed by the chatbot. It maps the user's natural language intent into a structured record of a real cloud resource.

| Field | Type | Description |
| :--- | :--- | :--- |
| `type` | String | Enum: `EC2` or `S3`. |
| `name` | String | The human-readable name provided by the user. |
| `region` | String | The AWS region where the resource is deployed. |
| `status` | String | Tracks the state: `pending`, `active`, or `failed`. |
| `terraformCode`| String | Stores the generated HCL code used for the deployment. |
| `executionOutput`| String | Stores the raw CLI output from `terraform apply`. |
| `details` | Object | **Collected Variables:** Stores resource-specific keys (e.g., `instanceType`). |
| `createdAt` | Date | Tracks when the resource was first provisioned. |



---

### 2. Fulfillment of Data Requirements

* **Request Tracking:** Every creation attempt is logged in the `Resource` collection with its `executionOutput`.
* **Collected Variables:** The `details` object captures specific parameters extracted by the LLM from natural language.
* **Terraform Generation:** The `terraformCode` field ensures that we have a persistent record of the infrastructure-as-code generated for every request.
* **Execution Status:** The `status` field provides an immediate "at-a-glance" view of whether the AWS provisioning succeeded or failed.
* **Read Capabilities:** By indexing the `type` field, the system can instantly list all "EC2" or "S3" instances as requested by the user.

---

### 3. Future Scalability
The schema is designed to be **extensible**. If we add support for RDS or Lambda in the future, we simply add those types to the `enum` and store their specific parameters inside the flexible `details` object without needing to migrate the existing database.

---