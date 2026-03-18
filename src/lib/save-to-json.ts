import fs from "fs/promises";
import path from "path";

export async function saveToJson(
  filename: string,
  content: any
): Promise<void> {
  try {
    // Ensure the filename ends with .json
    const jsonFilename = filename.endsWith(".json")
      ? filename
      : `${filename}.json`;

    // Create the logs directory path
    const logsDir = path.join(process.cwd(), "logs");

    // Ensure the logs directory exists
    await fs.mkdir(logsDir, { recursive: true });

    // Create the full file path
    const filePath = path.join(logsDir, jsonFilename);

    // Convert content to JSON string
    const jsonContent = JSON.stringify(content, null, 2);

    // Write the content to the file
    await fs.writeFile(filePath, jsonContent, "utf8");

    console.log(`Successfully saved ${jsonFilename} to logs folder`);
  } catch (error) {
    console.error("Error saving to JSON:", error);
  }
}
