# Brainberg Moderation Guide

This guide defines what belongs on Brainberg.eu. It is used by both human moderators and the AI moderation system.

## Platform Scope

Brainberg is a **European tech event aggregator**. We list events where people who build, use, or think about technology come together — in person or online.

**"Tech" includes:** software development, AI/ML, data engineering, cloud infrastructure, cybersecurity, hardware/electronics/IoT, design & UX, blockchain, and tech entrepreneurship.

**"European" means:** events physically located in a European country (including Cyprus and Malta), OR online events relevant to a European audience (regardless of organizer location).

## Categories

Each event gets exactly one primary category. Pick the best fit based on the event's main focus.

### AI/ML Research & Engineering (`ai_ml_research`)

Building, training, and deploying machine learning models. MLOps, research papers, frameworks like PyTorch and Hugging Face, NLP, computer vision, reinforcement learning.

**Examples:** deep learning meetup, MLOps conference, PyTorch workshop, NLP paper reading group

### AI Integration & Application (`ai_applied`)

Applying AI rather than researching it. Covers both developers using AI tools (Copilot, Cursor, agents, vibe coding, LLM APIs, prompt engineering, no-code AI) and organizations integrating AI into products, workflows, or operations (AI for marketing, legal, HR, customer support, etc.).

**Examples:** "Build with AI" workshop, Claude Code meetup, AI agents hackathon, generative AI in business, AI for marketers, Copilot for lawyers

### Software Engineering (`software_dev`)

Programming languages, frameworks, architecture, testing, and the craft of building software. This is the default category for general tech events.

**Examples:** RustConf, React meetup, Java user group, software architecture summit, code retreat

### Data & Analytics (`data_analytics`)

Data engineering, business intelligence, databases, data pipelines, analytics platforms. Events focused on managing and analyzing data.

**Examples:** PyData meetup, Databricks conference, Power BI user group, dbt meetup, PostgreSQL day

### Cloud & DevOps (`cloud_devops`)

Cloud infrastructure, Kubernetes, CI/CD, platform engineering, SRE, observability. Events about running and scaling systems.

**Examples:** KubeCon, AWS user group, DevOpsDays, Terraform workshop, SRE meetup

### Security (`security`)

Cybersecurity, privacy, application security, penetration testing, threat modeling, compliance.

**Examples:** OWASP meetup, BSides conference, CTF competition, security architecture workshop

### Design & UX (`design_ux`)

User experience, accessibility, design systems, usability testing, UI design. Events where the primary focus is on designing for humans.

**Examples:** UX conference, accessibility workshop, design system meetup, SmashingConf

### Web3 & Blockchain (`blockchain_web3`)

Blockchain technology, DeFi, smart contracts, decentralized systems, crypto. Events focused on decentralized technology.

**Examples:** Ethereum meetup, blockchain developer conference, DeFi workshop

### Entrepreneurship (`entrepreneurship`)

Startups, product management, tech leadership, fundraising, growth, venture capital. Events about building and scaling tech businesses.

**Examples:** startup pitch night, ProductTank meetup, founder networking, tech leadership forum

### Hardware, Robotics & IoT (`hardware_iot`)

Physical computing, robotics, embedded systems, IoT, 3D printing, electronics, Arduino, drones, batteries. Events about building physical things.

**Examples:** robotics meetup, Arduino workshop, IoT conference, 3D printing demo, electronics lab

### Hacker / Maker Community (`hacker_maker`)

Hacker camps, hackerspaces, maker faires, community congresses (CCC, EMF, eth0). Events rooted in the hacker/maker culture and ethos.

**Examples:** Chaos Communication Congress, EMF camp, hackerspace open night, repair cafe, maker faire

### Other (`other`)

Events that don't clearly fit any category above but are still relevant to the tech community.

## Event Types

- **Conference** — multi-talk event, usually full-day or multi-day, with a program and speakers
- **Meetup** — informal community gathering, typically evening, 1-3 talks or discussions
- **Workshop** — hands-on, interactive learning session (bootcamp, masterclass, dojo, training)
- **Hackathon** — collaborative building event, usually timed (hack day, hack night, code retreat)
- **Networking** — social event primarily for meeting people (drinks, stammtisch, breakfast, mixer)
- **Webinar** — online-only presentation or panel
- **Panel** — moderated discussion with multiple speakers
- **Demo Day** — showcase of projects or startups
- **Career Fair** — hiring-focused event

## Event Moderation Decisions

### Approve

Clearly a tech event that fits the platform. The vast majority of events from our scrapers should be approved.

### Pending (needs human review)

Something is ambiguous. Use pending when:

- The title is in a language you're unsure about and the description is missing
- It could be tech-adjacent but might not have technical content (e.g., "Tech Networking Drinks" — is it for tech people or just a bar event using "tech" as a buzzword?)
- The event seems auto-generated or spammy but you're not sure
- It's a recurring event with a very generic title and no description

**When in doubt, use pending rather than reject.** A human can quickly approve a pending event, but a rejected event might be lost.

### Reject

Clearly not a fit. Reject when:

- **Not tech:** the event has nothing to do with technology or creative/innovative building (e.g., yoga class, cooking workshop, live music, movie night, fashion show, poker night).
  - **Note:** of course there are exceptions in the form of high-tech, high-skill, or high-nerdiness variants of such event categories. E.g. we love an interactive jam session with DIY instruments (e.g. Look Mum No Computer), and of course the yearly screening of the movie Hackers (1995).
- **Spam or marketing:** the event is a thinly disguised sales pitch with no educational or community value
- **Recruitment event:** job fair or hiring event with no technical content (career fairs with tech talks are fine)
- **Non-European in-person:** the event is physically located outside Europe (online events from anywhere are fine)
- **Duplicate listing:** exact same event already on the platform under a different name

## Edge Cases

- **"Tech" in the name but not tech:** "Happy Techno" (DJ night), "Bake Tech" (baking), "Hair Tech" (salon) — reject
- **Tech-adjacent business events:** "FinTech Networking" — approve if there's technical content, pending if unclear
- **Kids' coding events (CoderDojo):** approve — they're educational tech events
- **Open source community events (FOSDEM, Linux user groups):** approve — core tech community
- **Women/diversity in tech events:** approve — community building within tech
- **Barcamp / unconference:** approve — community-driven tech format
- **Digital literacy for seniors ("Smart Tech for Seniors"):** approve — tech education
- **Building/construction tech:** approve if focused on software/IoT or non-mainstream innovative aspects, reject if purely about physical construction
- **Science conferences with no tech angle:** reject unless there's a clear technology/computing component
