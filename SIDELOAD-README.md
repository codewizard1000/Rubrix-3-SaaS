# Rubrix3 Word Add-in - Sideload Instructions

## 📦 Files Included

- **rubrix3-manifest.xml** - The manifest file needed to sideload the add-in

## 🌐 Deployment Information

| Item | URL |
|------|-----|
| **Live Add-in URL** | https://rubrix3.vercel.app |
| **GitHub Repository** | https://github.com/codewizard1000/rubrix3 |
| **Vercel Dashboard** | https://vercel.com/jon-s-projects-1947152d/rubrix3 |

## 🚀 How to Sideload the Add-in to Microsoft Word

### Method 1: Manual Sideload (Recommended)

1. **Download the manifest file**
   - Save `rubrix3-manifest.xml` to your computer

2. **Open Microsoft Word (Desktop)**
   - Must be Word 2016 or later (Windows) or Word 2019/365 (Mac)

3. **Navigate to Add-ins**
   - **Windows:** Insert tab → Get Add-ins → My Add-ins → Manage My Add-ins
   - **Mac:** Insert tab → Add-ins → My Add-ins

4. **Upload the Manifest**
   - Click "Upload My Add-in" or "Browse"
   - Select the `rubrix3-manifest.xml` file you downloaded
   - Click "Open" or "Upload"

5. **Use the Add-in**
   - The Rubrix add-in will appear in the **Home** tab
   - Look for the "Rubrix" button in the ribbon
   - Click it to open the task pane

### Method 2: SharePoint/AppSource (For Organization-Wide Deployment)

For deploying to an entire organization, use the Office 365 Admin Center:
1. Admin Center → Settings → Integrated apps → Upload custom apps
2. Upload the manifest.xml file
3. Assign to users

---

## ✨ New Feature: Few-Shot Learning for AI Grading

Rubrix3 includes a powerful new feature that allows the AI to learn your grading style!

### How It Works

1. **Upload Graded Examples**
   - In the "AI Grade Document" section, you'll see a new green box labeled "Upload Graded Examples (Few-Shot)"
   - Click "Upload Examples (.docx)" and select one or more previously graded papers
   - These should be DOCX files with grades and comments already at the top

2. **AI Learns Your Style**
   - The AI analyzes your grading patterns
   - It learns where you take off points
   - It adapts to your comment style and tone

3. **Apply to New Papers**
   - When you grade new student papers, the AI applies similar standards
   - Grades and comments will match your demonstrated style

### Example Usage

1. Upload 2-3 example papers for each assignment type
2. The examples should include:
   - A grade at the top (A, B, C, etc. or numeric)
   - Comments explaining deductions
   - Different quality levels help the AI understand your range

---

## 🛠️ Troubleshooting

### "Add-in not loading"
- Check your internet connection
- Verify you're using Word 2016+ (Windows) or Word 2019/365 (Mac)
- Try refreshing the add-in: Right-click task pane → Reload

### "Manifest validation failed"
- Make sure you downloaded the complete XML file
- Try downloading again from this folder

### "Task pane is blank"
- Clear browser cache in Word
- Restart Word and try again
- Check that https://rubrix3.vercel.app loads in a regular browser

---

## 📧 Support

For issues or questions:
- GitHub Issues: https://github.com/codewizard1000/rubrix3/issues
- Vercel Status: https://status.vercel.com

---

## 🔄 Updates

The add-in auto-updates when deployed to Vercel. No action needed on your end!

Last updated: February 16, 2026
