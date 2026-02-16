/**
 * Searches the open Word document (or editor) for a given text snippet
 * and adds a comment with the provided feedback.
 *
 * @param {string} textSnippet - The exact text to search for
 * @param {string} commentText - The comment to insert
 */
export async function searchDocument(textSnippet, commentText) {
  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const searchResults = body.search(textSnippet, { matchCase: true, matchWholeWord: false });
      context.load(searchResults, "text,items");
      await context.sync();

      if (searchResults.items.length === 0) {
        console.warn("Snippet not found:", textSnippet);
        return;
      }
      searchResults.items[0].insertComment(commentText);
      await context.sync();
      console.log("✅ Comment added for:", textSnippet);
    });
  } catch (error) {
    console.error("Error adding comment:", error);
  }
}