import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const executeTerraform = async (params, hclCode) => {
    const tfPath = path.resolve('./terraform-temp');
    const dotTerraformPath = path.join(tfPath, '.terraform');

    // 1. Ensure directory exists
    if (!fs.existsSync(tfPath)) {
        fs.mkdirSync(tfPath, { recursive: true });
    }

    // 2. Write the HCL file
    fs.writeFileSync(path.join(tfPath, 'main.tf'), hclCode);

    // 3. Handle MOCK MODE
    if (process.env.MOCK_AWS === 'true') {
        console.log("⚠️ MOCK MODE: Simulating AWS Creation...");
        return {
            success: true,
            output: `(MOCK) Terraform successfully applied configuration for ${params.name}.`,
            planOutput: "Plan: 1 to add, 0 to change, 0 to destroy."
        };
    }

    // 4. Handle LIVE MODE
    try {
        console.log(`🛠️ Initializing and Deploying ${params.name}...`);

        // Only run init if the .terraform folder is missing
        if (!fs.existsSync(dotTerraformPath)) {
            console.log("🛠️ Running terraform init...");
            execSync(`cd "${tfPath}" && terraform init`, { stdio: 'inherit' });
        }

        console.log("🚀 Executing terraform apply...");
        // auto-approve bypasses the interactive "yes" prompt
        const output = execSync(`cd "${tfPath}" && terraform apply -auto-approve -no-color`).toString();

        return {
            success: true,
            output: output,
            planOutput: "Apply complete! Resources deployed successfully."
        };
    } catch (error) {
        // Capture stderr if available (actual terraform error)
        const errorMessage = error.stderr?.toString() || error.message;
        console.error("❌ Terraform Error:", errorMessage);

        return {
            success: false,
            error: errorMessage
        };
    }
};

export const generateHCL = (type, params) => {
    const safeName = (params?.name || "unnamed_resource").replace(/\s+/g, '_');
    const safeRegion = params?.region || 'us-east-1';
    const safeInstanceType = params?.instanceType || 't2.micro';

    // 🚀 Professional approach: Terraform reads credentials 
    // from your 'aws configure' setup automatically.
    const providerHeader = `
provider "aws" {
  region = "${safeRegion}"
}
`;

    if (type === 'EC2') {
        return providerHeader + `
data "aws_ami" "latest_amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_instance" "${safeName}" {
  ami           = data.aws_ami.latest_amazon_linux.id
  instance_type = "${safeInstanceType}"

  tags = {
    Name = "${params.name || 'EC2Instance'}"
  }
}`;
    }

    if (type === 'S3') {
        return providerHeader + `
resource "aws_s3_bucket" "${safeName}" {
  bucket = "${(params.name || 'unnamed-bucket').toLowerCase().replace(/\s+/g, '-')}"

  tags = {
    Name        = "${params.name}"
    Environment = "Dev"
  }
}`;
    }

    return "";
};