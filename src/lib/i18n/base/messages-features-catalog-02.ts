export const m_messages_features_catalog_02 = {
      "generatedIdentity": {
        "title": "Generate system identity values",
        "summary": "New accounts receive a generated username, an official system ID, and a Civizen Member ID automatically.",
        "workflow": [
          "Create a new account with your name and one contact method.",
          "Let the backend generate your identity values during account creation.",
          "Use the generated username immediately, and change it later if your profile rules allow it."
        ],
        "details": [
          "Usernames are generated from the person’s name and adjusted automatically until they are unique.",
          "Each account also receives a unique Civizen Member ID for system identity purposes.",
          "Each account also receives a Civizen Member ID in an internal reference format."
        ]
      },
      "userVerification": {
        "title": "Approve user verification",
        "summary": "Authorized admins can mark a user as verified or unverified, and the app reflects that state immediately.",
        "workflow": [
          "Open Settings and go to Admin, then Users.",
          "Find the person you want to review.",
          "Use the verify or unverify control on their row.",
          "See the updated verification status immediately in the admin list and profile-facing badge."
        ],
        "details": [
          "Newly registered users start as unverified by default.",
          "Verification can be changed directly from the Users page without opening a separate editor.",
          "The user list also shows each person’s generated Civizen identifiers for identity review."
        ]
      },
      "mobileDownloads": {
        "title": "Download the mobile test builds",
        "summary": "The Download page gives testers a direct path to the latest Android build and explains the current iPhone rollout status.",
        "workflow": [
          "Open Download from the auth screens, from a direct link, or from the page menu.",
          "Download the current Android APK.",
          "Install it on your Android device and allow local installation if needed.",
          "Return later for newer builds and future iPhone testing access."
        ],
        "details": [
          "The Android build is published as a direct APK for testing.",
          "The iPhone rollout is explained on the same page so users understand why it follows a different process."
        ]
      },
      "lawLibrary": {
        "title": "Read the law library",
        "summary": "The Law page organizes the law library into a structured reading flow, with searchable sources, article browsing, and reviewable community contributions.",
        "workflow": [
          "Open Law from the profile page menu or from Study.",
          "Choose a reading track such as international civil or international criminal law.",
          "Move from the legal framework into sections and then into the article-level material.",
          "Suggest a contribution when a source, summary, or organizational improvement is needed.",
          "Track your submission status or review pending submissions if you have Law review access.",
          "Copy a direct article link when you want to return to or share a specific article.",
          "Use the review filters to narrow reviewer work by status, type, and track."
        ],
        "details": [
          "Law is grouped under the Knowledge section so it behaves like a reference library rather than a settings or marketplace tool.",
          "The page is structured around jurisdiction, domain, instrument, section, and article to keep long legal material readable.",
          "Contribution calls to action are built into the page so readers can help improve organization and coverage over time.",
          "The live version stores sources, sections, articles, and contribution statuses in Supabase so the library can keep growing beyond the starter catalog.",
          "Reviewers can now leave notes on approvals, requested changes, and rejections so contributors can understand what happened next.",
          "Each article now has a direct link so the reader can reopen the page at the exact article later.",
          "Review moderation is easier because reviewers can filter the queue instead of scanning every contribution manually.",
          "Moderators can also inspect a separate history view to understand past review decisions and their notes."
        ]
      },
      "termsUse": {
        "title": "Review the Terms of Use",
        "summary": "The Terms of Use page explains the platform’s conduct rules, governance principles, and the agreement users accept when signing up.",
        "workflow": [
          "Open Terms of Use from signup, Settings, or the page menu.",
          "Read the platform purpose, conduct rules, and governance model.",
          "Accept the terms during signup before creating an account."
        ],
        "details": [
          "The Terms page is available before signup so consent is informed rather than hidden behind account creation.",
          "Signup now requires an explicit checkbox confirming agreement to the Terms of Use.",
          "The page includes the platform-law principle so users can understand that statement directly in the product."
        ]
      },
      "lumaNativeCurrency": {
        "title": "Luma: prototype Civizen credits",
        "summary": "Luma is a non-transferable prototype credit for demonstration and product testing. It is not money, and it does not settle real transactions. The smallest display unit is the Lumen: one hundred Lumens make one Luma.",
        "workflow": [
          "Illustrative credit amounts may be shown in Luma for marketplace demos as the product grows.",
          "Balances stay tied to verified profiles and follow governance rules aimed at safety and fair testing.",
          "The design is for demonstration — not speculative trading or real settlement."
        ],
        "details": [
          "Peer sending and marketplace transfers are disabled while Luma remains a prototype.",
          "Behind the scenes, amounts may be tracked in whole Lumens for precise display accounting.",
          "Do not treat Luma balances as funds, claims on assets, or a wallet for trade."
        ]
      },
      "marketListingsLuma": {
        "title": "Market listings in Luma",
        "summary": "Members can publish offers as products or services with titles, optional descriptions, and illustrative credit amounts in Lumens. Use Start agreement or Contact — there is no sold-via-Luma checkout.",
        "workflow": [
          "Open Market to browse a searchable grid of offers with illustrative credit amounts shown in Luma.",
          "When signed in, use Post an offer to choose product or service, describe the item, and set an illustrative credit amount.",
          "Remove your offer from the public list when it should no longer appear."
        ],
        "details": [
          "Row level security limits who can create or change listings; shoppers only see published rows.",
          "Market managers can update any listing using the market permission when moderation is needed.",
          "Illustrative amounts do not move real value: Luma is a prototype credit and does not settle transactions."
        ]
      },
      "lumaLedgerTransfers": {
        "title": "Luma ledger and prototype activity",
        "summary": "Ledger tooling may record prototype Lumens for demos. Peer and marketplace transfers are disabled; Luma does not settle real transactions.",
        "workflow": [
          "Market contact uses Start agreement or Contact — not payment deduction.",
          "Idempotency keys protect demo allocation requests from accidental double submission.",
          "Activity history, when shown, is for prototype demonstration only."
        ],
        "details": [
          "Balances cannot be treated as withdrawable funds or claims on assets.",
          "The ledger table rejects updates and deletes so demo records stay trustworthy for audits.",
          "Peer-to-peer sends remain disabled under the prototype policy."
        ]
      },
      "lumaTreasuryMintAndActivity": {
        "title": "Prototype credit allocation and activity",
        "summary": "Market operators may allocate prototype Lumens for testing under permission checks. Peer transfers are disabled; Luma does not settle real transactions.",
        "workflow": [
          "From Settings, marketplace operators open Allocate prototype credits and enter a username or profile id plus an amount.",
          "Peer transfers stay disabled while credits remain non-transferable prototypes.",
          "Scroll the prototype activity log to review demonstration credits in one place."
        ],
        "details": [
          "Minting creates a treasury line in the ledger with no sender profile so audits stay honest about where demo value originated.",
          "Activity rows respect privacy: you only see entries where you are the sender or receiver.",
          "Governance readiness and stewardship controls live separately; this tool is for controlled operational demo credits."
        ]
      },
      "marketPreview": {
        "title": "World Citizen marketplace",
        "summary": "The Market page is a living storefront where members list products and services and filter what they want. Illustrative credit amounts may appear in prototype Luma credits; Luma does not settle real transactions.",
        "workflow": [
          "Open Market from the main navigation.",
          "Search and filter by product or service; use Start agreement or Contact on a listing.",
          "Use Post an offer to list, and review prototype activity when available."
        ],
        "details": [
          "Listings may store Lumens for display accounting while the interface speaks in Luma for readability.",
          "Prototype credits are not money and cannot be withdrawn or redeemed as funds.",
          "Future releases can add photos, messaging, and delivery tools without treating Luma as settlement currency."
        ]
      },
      "digitalAgreements": {
        "title": "Agreements",
        "summary": "Create, review, sign, and manage agreements with people and organizations. Start from a Civizen activity or create an agreement directly.",
        "workflow": [
          "Open Agreements, or start from Market, an opportunity, a program, a pilot, or another related activity.",
          "Identify parties and signatories, prepare a version, and propose it for signature.",
          "Sign electronically in Civizen, or record a paper or external execution, then keep the executed record."
        ],
        "details": [
          "Agreements is a platform capability. Marketplace listings remain an important entry point, and the working area is /agreements.",
          "Parties can be individuals, Civizen organizations, or external institutions. Native electronic signing and externally executed documents are both supported.",
          "Signed versions are locked and fingerprinted. Later amendments do not change the historical signed agreement."
        ]
      },
      "phoneFirstSignup": {
        "title": "Sign up with phone-first identity",
        "summary": "Signup now prioritizes phone-based registration while still allowing email as the single alternate contact method.",
        "workflow": [
          "Open Sign Up and enter your full name.",
          "Use the detected flag and country code, then enter your local phone number, or provide an email instead.",
          "Choose your language, agree to the Terms, and create the account."
        ],
        "details": [
          "The signup form no longer asks people to invent a username up front.",
          "Phone entry uses the detected country and dialing code so mobile registration feels lighter.",
          "Signup accepts either email or phone, but not both in the same registration step."
        ]
      },
      "profileEditing": {
        "title": "Edit profile details",
        "summary": "Update your name, username, bio, and country from the Edit Profile experience with full autosave.",
        "workflow": [
          "Open Settings and choose Edit Profile.",
          "Update identity fields like name, username, country, or bio.",
          "Pause briefly after editing and let the page save your changes automatically."
        ],
        "details": [
          "Edit Profile is the main place to maintain personal identity data.",
          "Country uses a searchable dropdown rather than free text.",
          "All core profile fields now autosave without a dedicated Save Changes button unless an autosave fails.",
          "The page supports continuing profile maintenance without leaving the main app shell."
        ]
      },
      "cardLayoutEditor": {
        "title": "Global build editor",
        "summary": "Users with Build access can open a floating editor, select visible UI elements, and nudge them into place directly in the app.",
        "workflow": [
          "Open any page where Build access is enabled for your role.",
          "Tap the floating Build button to enter build mode.",
          "Click the visible element you want to adjust.",
          "Use the arrow controls or keyboard arrows to move that element until it sits correctly.",
          "Exit edit mode and keep the saved placement for that device."
        ],
        "details": [
          "Build access is controlled by the global permission matrix rather than a hardcoded founder bypass.",
          "Offsets are saved locally, which makes it practical for pixel-level layout tuning during design review.",
          "The builder can now target a much broader set of visible texts, icons, fields, and other UI elements across the app."
        ]
      },
      "countryAutoSave": {
        "title": "Auto-save country changes",
        "summary": "Choose a country from the Edit Profile picker and have it save as part of the same autosave flow as the rest of the profile fields.",
        "workflow": [
          "Open Settings and choose Edit Profile.",
          "Use the country picker to find and select a new country.",
          "Keep editing normally while the profile autosave flow remembers the new country."
        ],
        "details": [
          "Country changes are included in the full profile autosave cycle.",
          "The country field remembers the saved value when the user comes back later.",
          "Auto-saving country does not wipe the other unsaved fields in the editor."
        ]
      },
      "photoUpload": {
        "title": "Upload a profile photo",
        "summary": "Choose and upload a profile image so your identity feels more personal and recognizable.",
        "workflow": [
          "Open Profile or Edit Profile and choose the photo upload action.",
          "Select an image file from your device.",
          "Upload the photo and wait for the updated avatar to appear."
        ],
        "details": [
          "Profile photos are stored in the app’s avatar storage bucket.",
          "Uploads are validated for image type and size before saving.",
          "Successful uploads refresh the visible profile image across the app."
        ]
      },
      "languageTheme": {
        "title": "Change language and theme",
        "summary": "Use Settings to switch languages, choose appearance, and tailor the app to how you want it to feel.",
        "workflow": [
          "Open Settings from the bottom navigation.",
          "Choose a language or appearance mode.",
          "Return to the app and continue with the new presentation applied."
        ],
        "details": [
          "Language preference is synced to the user profile when available.",
          "Theme settings let people choose light, dark, or system behavior.",
          "The experience is meant to make the app more personal without adding friction."
        ]
      },
      "pillarCustomization": {
        "title": "Customize pillar names",
        "summary": "Adjust pillar names and descriptions so the framework reflects the terminology you want to use, with autosave handling the persistence.",
        "workflow": [
          "Open Settings and navigate to Pillars.",
          "Review the current pillar names and descriptions.",
          "Edit them and let the page save the updates automatically once you finish the local edit."
        ],
        "details": [
          "Pillar customization lets the framework feel more aligned to the user’s language.",
          "Names and descriptions can be tailored without changing the app’s core structure.",
          "The page now follows the same autosave-by-default pattern as the rest of the editable app.",
          "This supports interpretation while preserving the five-pillar model underneath."
        ]
      },
} as const;
