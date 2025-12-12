# League of Legends In-House Scrim Team Balancer

A robust, feature-rich web tool designed to split 10 players into two evenly matched League of Legends teams, minimizing player dissatisfaction through intelligent role assignment and precise skill calculation.

## ✨ Key Features

* **Advanced Player Metrics (MMR Calculation):** Moves beyond simple Tier rankings. The system calculates a dynamic "Combat Power" score by integrating the player's official tier (MMR base) with mutable factors:
    * **Condition Modifier:** Allows players to manually adjust their score based on their current state (e.g., **"Hard Carry Mode" +20%**, or **"Drunk/Tired" -40%**).
    * **Shotcalling Bonus:** Grants a bonus score for players designated as main shotcallers (Brain Bonus).

* **Optimal Lane Assignment (Minimize Autofill):** Uses a permutation algorithm (5! = 120 combinations) to find the absolute best role distribution within each team, ensuring the highest preference satisfaction score.
    * Prioritizes Main and Secondary roles first.
    * Treats players who select **"Random/ALL"** as flexible fillers to cover vacant positions.

* **Preference Tracking and Transparency:** The result clearly displays *how* a player was assigned to a role:
    * **[MAIN]** for Primary Role assignment.
    * **[SUB]** for Secondary Role assignment.
    * **[AUTO]** for Forced/Autofill assignment (if no preference was met).

* **Seamless Management:** Includes a user-friendly interface with an instant edit function. Click on any player card to quickly modify their name, tier, condition, or role preferences via a modal popup.

## 🚀 How to Use

1.  Input all 10 participants along with their Tier, Main/Sub Roles, Condition, and Shotcalling ability.
2.  Click **"⚖️ 정밀 밸런싱 시작" (Start Precision Balancing)**.
3.  The system instantly generates balanced Blue and Red teams, complete with assigned Top, Jungle, Mid, ADC, and Support roles.
