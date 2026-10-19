/*
  Everything on the site comes from this file.
  To add a photo or certificate: drop the image into the matching assets/ folder,
  then add one line below. You never need to edit index.html or main.js.

  "tone" is the glow colour the page takes when that photo is on screen.
  If you leave tone out, the browser picks a colour from the photo itself.
*/
window.SITE = {
  name: "Piyush Nandi",
  title: "Student, aspiring software engineer and visual creator",
  intro: "Computer Science student at SRM Ramapuram, Chennai. I build websites and projects, and I design posters and branding for my college tech club.",
  email: "nandipiyush07@gmail.com",

  links: {
    github: "https://github.com/gemoniaa",
    linkedin: "https://www.linkedin.com/in/piyush-nandi-742673387",
    // Instagram is switched off for now. Paste the link here later and it will appear.
    instagram: "",
    // Google Drive folder with the full creative portfolio
    drive: "https://drive.google.com/drive/folders/17Z_0ZSCJ2oEjegtnD8S0KUHZixRPuepr?usp=sharing"
  },

  resume: "assets/Piyush_Nandi_Resume.pdf",

  hero: { src: "assets/cutouts/podium.webp", tone: "#b8743a" },
  screen: { src: "assets/cutouts/vest.png", tone: "#af795d" },
  cutouts: [
    { src: "assets/cutouts/laptop.png", tone: "#b08968" },
    { src: "assets/cutouts/podium.webp", tone: "#b8743a" },
    { src: "assets/cutouts/back.webp", tone: "#c4812f" }
  ],

  // Projects. Leave live, repo or post empty ("") to hide that button.
  projects: [
    {
      title: "MedFlow, SRM Prime Hospital",
      text: "Manages hospital human resources and cuts patient waiting time by improving the workflow in one click. It has a gateway page with a Manager's Tab and a Doctor App.",
      role: "Team Brain Bytes. I built and designed the website.",
      tags: ["Web app", "Healthcare", "Hackathon"],
      live: "https://gemonia-medflow.vercel.app/index.html",
      repo: "",
      post: ""
    },
    {
      title: "SkillBridge",
      text: "A portal for academia and industry collaboration: skill mapping, internships and placement. Built for the Code2Web Build-A-Thon.",
      role: "IEEE SMC, SRM Ramapuram, 30 September 2026",
      tags: ["Web portal", "Build-A-Thon"],
      live: "",
      repo: "",
      post: "https://lnkd.in/p/gizz-9TH"
    },
    {
      title: "Raghusons Infra website",
      text: "A demo website I made to apply for an internship at Raghusons Infra Engineering Pvt Ltd, a civil engineering firm in Jodhpur.",
      role: "Internship application demo",
      tags: ["Web design", "Demo"],
      live: "https://raghusons.vercel.app",
      repo: "",
      post: ""
    }
  ],

  experience: [
    { logo: "assets/logos/chipset.png", role: "Designer", org: "CHiPSET", period: "September 2025 to present", place: "Chennai, hybrid", text: "Managed the creative branding, posters and visual assets for major club events like FOLK v5.0 and Cloud9. Handled live workshop demonstrations on AI agents while working with the team.", skills: ["Photography", "Video editing"] }
  ],

  // logo is optional for each education line
  education: [
    { logo: "assets/logos/srm.png", place: "SRM Institute of Science and Technology, Ramapuram", detail: "B.Tech, Computer Science and Engineering", period: "2025 to 2029", score: "CGPA 9.63", note: "After two semesters" },
    { logo: "assets/logos/kv.png", place: "Kendriya Vidyalaya No 2 AF Stn, Jodhpur", detail: "Class XII, CBSE, with Computer Science", period: "2025", score: "81.8%", note: "Best five subjects" },
    { logo: "assets/logos/kv.png", place: "Kendriya Vidyalaya No 2 AF Stn, Jodhpur", detail: "Class X, CBSE", period: "2023", score: "86%", note: "Five main subjects" }
  ],

  languages: [
    { name: "English", level: "Full professional proficiency" },
    { name: "Hindi", level: "Native" },
    { name: "Bengali", level: "Native" }
  ],

  // Certificates. link is optional.
  certs: [
    { title: "Code Merge Hackathon v2.0, AI for Impact", issuer: "SRM Institute of Science and Technology, Kattankulathur", date: "9 to 11 September 2026", note: "Finalist", img: "assets/certs/codemerge-v2.jpg", link: "https://lnkd.in/p/gu7gGBCs" },
    { title: "Code2Web Build-A-Thon", issuer: "IEEE SMC and Computer Society of India, SRM Ramapuram", date: "30 September 2026", note: "Participation", img: "assets/certs/code2web-ieee.jpg", link: "https://lnkd.in/p/gizz-9TH" },
    { title: "Operating System Course", issuer: "Scaler Topics", date: "18 October 2026", note: "Certificate of Excellence", img: "assets/certs/os-scaler.jpg", link: "" },
    { title: "Introduction to C++", issuer: "Sololearn", date: "23 March 2026", note: "Course completed", img: "assets/certs/cpp-sololearn.jpg", link: "" },
    { title: "Getting Started with Artificial Intelligence", issuer: "IBM SkillsBuild", date: "4 February 2026", note: "Course completed", img: "assets/certs/ibm-ai.jpg", link: "" }
  ],

  // Community and events. link is the LinkedIn post.
  events: [
    { title: "Cloud 9, CHiPSET x Google", role: "Speaker", text: "Explained the topics to students and guided them through building an AI agent.", date: "", img: "assets/events/cloud9-podium.jpg", tone: "#cb9f5a", link: "https://lnkd.in/p/gZ6de4ND" },
    { title: "Code2Web Build-A-Thon", role: "Participant", text: "Built SkillBridge, a portal for academia and industry collaboration.", date: "30 September 2026", img: "assets/events/code2web-venue.jpg", tone: "#8a9bb8", link: "https://lnkd.in/p/gizz-9TH" },
    { title: "Synesis'26 Hackathon", role: "Team Brain Bytes", text: "Presented MedFlow, the SRM Prime Hospital gateway.", date: "October 2026", img: "assets/events/medflow-showcase.jpg", tone: "#b0545c", link: "" }
  ],

  // Photos on the 3D cylinder. Add or remove lines freely.
  gallery: [
    { src: "assets/clicks/work-session.jpg", title: "Working at a hackathon", tone: "#967259" },
    { src: "assets/clicks/polo-back.jpg", title: "In the event team polo", tone: "#c07a30" },
    { src: "assets/events/cloud9-stage.jpg", title: "Cloud 9", caption: "Guiding students through building an AI agent", tone: "#b8702f" },
    { src: "assets/events/cloud9-podium.jpg", title: "Cloud 9", caption: "Explaining the topics to students", tone: "#cb9f5a" },
    { src: "assets/events/medflow-showcase.jpg", title: "MedFlow", caption: "The SRM Prime site, ready to present", tone: "#b0545c" },
    { src: "assets/events/synesis-countdown.jpg", title: "Synesis'26 Hackathon", caption: "The countdown screen", tone: "#3f78d6" },
    { src: "assets/events/team-build.jpg", title: "Team build session", tone: "#6b8cb0" },
    { src: "assets/events/security-crowd.jpg", title: "Security workshop", caption: "Hands-on session", tone: "#a8662f" },
    { src: "assets/events/security-demo.jpg", title: "Security workshop", caption: "Live demo", tone: "#c0643a" }
  ],

  // Your GitHub Pages site finds new files in assets/creative/ by itself (see creative-auto.js).
  // Only if your site uses its own domain (not yourname.github.io), fill this in, for example "gemoniaa/piyush-portfolio":
  repo: "",
  // Posters and videos you designed. They show on their own page, creative.html.
  // Easiest way: put the files in assets/creative/ (sub-folders become filter tabs, for example
  // Posters, Videos, Branding), then run:  python3 tools/build-creative-list.py
  // That writes creative-list.js for you. You can also add lines by hand here:
  // { type: "image", src: "assets/creative/Posters/poster-1.jpg", title: "Event poster", cat: "Posters" },
  // { type: "video", src: "assets/creative/Videos/promo.mp4", title: "Promo video", cat: "Videos" },
  creative: []
};
