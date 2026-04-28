# 🎯 AI Resume Tailor

An intelligent web application that automatically customizes your resume for any job description using Google Gemini AI. Save hours of manual editing and optimize your resume for each application in seconds!

## ✨ Features

- **AI-Powered Customization**: Uses OpenAI GPT-4 with a MINIMAL-CHANGE, HIGH-SIGNAL approach
- **Format Preservation**: Keeps your exact resume format - only updates summary and experience sections
- **Smart Keyword Optimization**: Automatically incorporates 5-8 high-value keywords from job descriptions
- **Contact Info Protection**: Never changes name, email, phone, address, or other personal details
- **Education Preserved**: Degrees, certifications, and education remain untouched
- **Preserves Achievements**: Never rewrites your bullets - only enhances them with keywords
- **PDF Template Support**: Use your own PDF resume template for consistent formatting
- **PDF Export**: Download tailored resume with your exact formatting or auto-generated professional layout
- **ATS-Friendly**: Generates resumes optimized for Applicant Tracking Systems
- **Bold Change Highlighting**: All changes displayed in bold with yellow highlight for easy review
- **Privacy-First**: Your API key is never stored on the server
- **Modern UI**: Beautiful, responsive interface built with React

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Gemini API key ([Get one FREE here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd resume-builder
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` folder:
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `backend/.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3001
   ```

4. **Start the application**
   
   From the root directory:
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 3001) and frontend (port 3000).

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📖 How to Use

1. **Enter your OpenAI API Key** (or use the one configured in backend/.env)
2. **Paste your complete, formatted resume** - include everything: header, contact info, all sections
3. **Paste the job description** you're applying for
4. Click **"Tailor My Resume"** and wait a few seconds
5. Review the output:
   - ✅ Contact info preserved
   - ✅ Format maintained
   - ✅ Only summary & experience updated
   - ✅ Changes shown in **bold** with yellow highlight
6. Click **"Download PDF"** to save your customized resume
7. Or click **"Copy"** to copy the text to your clipboard

**Note**: The AI only updates your Professional Summary and Work Experience bullets. Everything else (contact info, education, job titles, dates, certifications) stays exactly the same!

## 🎯 The MINIMAL-CHANGE Approach

This app uses a professional, minimal-change methodology that:

### ✅ WILL Do:
- Update your job title to match the position exactly
- Add 5-8 high-value keywords from the job description
- Slightly reorder bullets to prioritize relevant experience
- Update your summary to mirror the role's core focus (max 3 lines)

### ❌ WON'T Do:
- Rewrite or reword your achievement bullets
- Remove metrics, scope, or impact numbers
- Invent experience you don't have
- Change job titles, companies, or dates
- Add fluff or generic statements
- Exceed 1 page

### 🎖️ Result:
Your resume reads as if you're **already doing this job**, maximizing recruiter callbacks while preserving your seniority, authority, and credibility.

## 🏗️ Project Structure

```
resume-builder/
├── backend/
│   ├── server.js          # Express server with API endpoints
│   ├── package.json
│   └── .env              # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React component
│   │   ├── App.css       # Styling
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── package.json          # Root package with scripts
└── README.md
```

## 🔧 API Endpoints

### POST `/api/tailor-resume`
Generates a tailored resume based on current resume and job description.

**Request Body:**
```json
{
  "currentResume": "string",
  "jobDescription": "string",
  "apiKey": "string (optional if set in .env)"
}
```

**Response:**
```json
{
  "tailoredResume": "string"
}
```

### POST `/api/generate-pdf`
Converts HTML content to PDF.

**Request Body:**
```json
{
  "htmlContent": "string"
}
```

**Response:** PDF file (binary)

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Axios
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-4 API
- **PDF Generation**: pdf-lib (template-based or generated, client-side, no Chromium needed!)
- **Styling**: Custom CSS with modern gradients

## 💡 Tips for Best Results

1. **Use a Master Resume**: Include ALL your experiences, skills, and achievements (even if it's 2+ pages)
2. **Complete Job Description**: Paste the full job posting including requirements, responsibilities, and qualifications
3. **Review Bold Changes**: Check all **BOLD** marked changes before submitting
4. **Multiple Versions**: Generate different versions for different types of positions
5. **Keep It Honest**: The AI only enhances with keywords - it never invents fake experience
6. **Look for Keyword Additions**: Pay attention to how keywords are naturally inserted into your existing bullets

## 🔒 Security & Privacy

- API keys are never logged or stored on the server
- You can enter your API key directly in the UI for each session
- All processing happens server-side to protect your API key
- No resume data is stored or cached

## 🐛 Troubleshooting

### Backend won't start
- Make sure port 3001 is not in use
- Check that your `.env` file exists in the `backend` folder
- Verify Node.js version is 16 or higher

### PDF generation fails
- PDF is generated client-side in your browser
- Make sure JavaScript is enabled
- Try a different browser if issues persist
- As a fallback, use the "Copy" button

### DeepSeek API errors
- Verify your API key is correct
- Check your API quota hasn't been exceeded
- Ensure you have internet connectivity

## 📝 License

MIT License - feel free to use this for your job search!

## 🤝 Contributing

Feel free to open issues or submit pull requests for improvements!

## 📧 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Good luck with your job applications! 🚀**
