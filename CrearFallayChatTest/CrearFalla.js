const readline = require("readline-sync");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "PF";
const USERS_COLLECTION = "users";
const FALLA_CHAT_COLLECTION = "fallaChats";

(async () => {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection(USERS_COLLECTION);
    const fallaChats = db.collection(FALLA_CHAT_COLLECTION);

    let email, existingUser;
    do {
      email = readline.questionEMail("Email de la falla: ");
      existingUser = await users.findOne({ email });
      if (existingUser) console.log("⚠️ Ya existe un usuario con ese email.\n");
    } while (existingUser);

    const fullName = readline.question("Nombre completo de la falla: ");
    const phone = readline.question("Teléfono de contacto: ");
    const address = readline.question("Dirección: ");
    const password = readline.questionNewPassword("Contraseña: ", {
      min: 6,
      confirmMessage: "Repite la contraseña: ",
      unmatchMessage: "Las contraseñas no coinciden.",
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = fullName.toLowerCase().replace(/\s+/g, "");

    const count = await users.countDocuments({ role: "FALLA" });
    const fallaCode = `F${String(count + 1).padStart(4, "0")}`;

    const user = {
      username,
      password: hashedPassword,
      email,
      fullName,
      phone,
      address,
      role: "FALLA",
      active: true,
      profileImageUrl: "",
      refreshTokens: [],
      fallaInfo: {
        fallaCode,
        falleroIds: [],
        pendingRequests: [],
      },
    };

    const userResult = await users.insertOne(user);
    const creatorId = userResult.insertedId.toString();

    const fallaChat = {
      fallaCode,
      creatorId,
      creatorName: fullName,
      title: `Chat de la Falla ${fullName}`,
      imageUrl: "https://source.unsplash.com/random/800x600",
      createdAt: new Date().toISOString()
    };

    await fallaChats.insertOne(fallaChat);

    console.log("\n✅ Falla creada con éxito:");
    console.log(" - Usuario: " + username);
    console.log(" - Código de falla: " + fallaCode);
    console.log(" - Chat privado creado correctamente en 'fallaChats'");
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
})();
