const db = require("../config/db.js");

// Initialize activity_keyword_rules table and seed default rules
const initSettingsTables = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS activity_keyword_rules (
            id INT AUTO_INCREMENT PRIMARY KEY,
            keyword_match VARCHAR(255) NOT NULL,
            activity_classification VARCHAR(255) NOT NULL,
            priority INT DEFAULT 10,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await db.execute(createTableQuery);

    // Seed/Update defaults if needed
    const [rows] = await db.execute(`SELECT COUNT(*) as count FROM activity_keyword_rules`);
    if (rows[0].count === 0) {
        const defaultRules = [
            ["New commitment for", "new commitment", 15, "ACTIVE"],
            ["Commitment increase of", "commitment increase", 15, "ACTIVE"],
            ["Commitment renewal of", "commitment renewal", 15, "ACTIVE"],
            ["Commitment for", "commitment", 10, "ACTIVE"],
            ["Usage of", "usage", 5, "ACTIVE"]
        ];

        for (const rule of defaultRules) {
            await db.execute(
                `INSERT INTO activity_keyword_rules (keyword_match, activity_classification, priority, status) VALUES (?, ?, ?, ?)`,
                rule
            );
        }
        console.log("Seeded default Activity Keyword Rules into MySQL.");
    } else {
        // Ensure New commitment for priority is higher than Commitment for
        await db.execute(`UPDATE activity_keyword_rules SET priority = 15 WHERE LOWER(TRIM(keyword_match)) = 'new commitment for' AND priority <= 10`);
    }
};

// Get all keyword rules sorted by priority DESC, keyword length DESC
const getKeywordRules = async () => {
    const [rows] = await db.execute(`SELECT * FROM activity_keyword_rules ORDER BY priority DESC, CHAR_LENGTH(keyword_match) DESC, id ASC`);
    return rows;
};

// Create new keyword rule
const createKeywordRule = async (ruleData) => {
    const { keyword_match, activity_classification, priority, status } = ruleData;
    const [result] = await db.execute(
        `INSERT INTO activity_keyword_rules (keyword_match, activity_classification, priority, status) VALUES (?, ?, ?, ?)`,
        [keyword_match.trim(), activity_classification.trim().toLowerCase(), priority || 10, status || "ACTIVE"]
    );
    return result.insertId;
};

// Update existing keyword rule
const updateKeywordRule = async (id, ruleData) => {
    const { keyword_match, activity_classification, priority, status } = ruleData;
    await db.execute(
        `UPDATE activity_keyword_rules SET keyword_match = ?, activity_classification = ?, priority = ?, status = ? WHERE id = ?`,
        [keyword_match.trim(), activity_classification.trim().toLowerCase(), priority, status, id]
    );
    return true;
};

// Delete keyword rule
const deleteKeywordRule = async (id) => {
    await db.execute(`DELETE FROM activity_keyword_rules WHERE id = ?`, [id]);
    return true;
};

module.exports = {
    initSettingsTables,
    getKeywordRules,
    createKeywordRule,
    updateKeywordRule,
    deleteKeywordRule
};
