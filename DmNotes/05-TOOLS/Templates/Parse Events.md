<%*
console.log("Vault Scan Script Started!");

const files = app.vault.getMarkdownFiles();

// Function to determine category based on file path
function determineCategory(filePath) {
  if (filePath.startsWith("Sessions/")) {
    return "Sessions";
  } else if (filePath.startsWith("Events/Consequences/")) {
    return "Consequences";
  } else if (filePath.startsWith("Events/")) {
    return "Events";
  } else if (filePath.startsWith("Guilds/Adventurers Guild/Quests/")) {
    return "Quests";
  }
  return null;
}

for (const file of files) {
  try {
    const fileContent = await app.vault.read(file);
    // Updated regex to allow 1 or 4 digits for the year
    const dateTagRegex = /#Date_(\d{2})_(\d{2})_(\d{1,4})/g;
    let match;
    let dates = [];

    while ((match = dateTagRegex.exec(fileContent)) !== null) {
      const day = match[1];
      const month = match[2];
      const year = match[3];
      const formattedDate = `${year.padStart(4, '0')}-${month}-${day}`; // Pad year to 4 digits
      dates.push(formattedDate);
    }

    // Determine the category
    const category = determineCategory(file.path);

    if (dates.length > 0 || category) {
      // Sort the dates to find the earliest and latest
      dates.sort();
      const earliestDate = dates[0];
      const latestDate = dates[dates.length - 1];

      console.log(`Earliest date: ${earliestDate}, Latest date: ${latestDate} in ${file.path}`);

      // Get existing frontmatter
      const cachedMetadata = app.metadataCache.getFileCache(file);
      const existingFrontmatter = cachedMetadata?.frontmatter || {};

      // Update the frontmatter with the new fc-date, fc-end, and fc-category
      const newFrontmatter = {
        ...existingFrontmatter,
        "fc-date": earliestDate,
        "fc-end": latestDate.toString(), // Convert to string explicitly
      };

      // Add or remove fc-category based on the determined category
      if (category) {
        newFrontmatter["fc-category"] = category;
      } else {
        delete newFrontmatter["fc-category"];
      }

      // Write the updated frontmatter to the file
      await app.fileManager.processFrontMatter(file, (frontmatter) => {
        Object.assign(frontmatter, newFrontmatter);
      });
    }
  } catch (error) {
    console.error(`Error processing file ${file.path}: ${error}`);
  }
}

console.log("Vault Scan Script Finished!");
%>