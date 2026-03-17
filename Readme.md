## 📄 README.md

# AWS Provisioning Chatbot 🤖☁️
> A natural language interface to deploy AWS resources (EC2 & S3) using Node.js, LLMs, and Terraform.

This project allows users to describe their infrastructure needs in plain English. The backend interprets the intent, collects necessary variables, generates valid Terraform configuration, and performs a `terraform plan` to validate the setup.

## 🚀 Quick Start

### 1. Prerequisites
* **Node.js** (v18+)
* **Terraform** installed locally ([Download here](https://developer.hashicorp.com/terraform/downloads))
* **OpenAI API Key** (or compatible LLM endpoint)
* **MongoDB** (Local or Atlas)

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-link>
cd aws-chatbot-backend

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env` file in the root:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/aws-chatbot
OPENAI_API_KEY=your_key_here
```

### 4. Running the App
```bash
# Start the backend server
npm run dev
```

## 🛠 Features
* **Intent Recognition**: Uses LLM to distinguish between "Create EC2", "Create S3", and "List Resources".
* **Stateful Conversation**: Remembers missing parameters (e.g., if you forget the bucket name, it asks you).
* **IaC Generation**: Dynamically writes `.tf` files based on user input.
* **Validation**: Runs `terraform init` and `terraform plan` via Node `child_process`.
* **Resource Tracking**: Saves created resource metadata in MongoDB for easy querying.

---