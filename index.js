require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const BANK_ACC = process.env.BANK_ACC;
const BANK_NAME = process.env.BANK_NAME || "MB";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ===== DATA =====
function loadData() {
  try {
    return JSON.parse(fs.readFileSync("./data.json"));
  } catch {
    return {
      Fluorite: "safe",
      "Migul VN": "safe",
      Sonic: "safe",
      "Proxy Aim": "safe"
    };
  }
}

function saveData(data) {
  fs.writeFileSync("./data.json", JSON.stringify(data, null, 2));
}

// ===== TEMP =====
const orders = new Map();

// ===== UTIL =====
function generateOrderId() {
  let id;
  do {
    id = "HD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  } while ([...orders.values()].some(o => o.orderId === id));
  return id;
}

function getExpireDate(time) {
  const now = new Date();
  if (time === "week") now.setDate(now.getDate() + 7);
  if (time === "month") now.setMonth(now.getMonth() + 1);
  return now.toLocaleString("vi-VN");
}

// ===== EMBED (CHỈ THUMBNAIL) =====
function createEmbed(data) {
  const statusIcon = (s) =>
    s === "safe" ? "🟢 𝗦𝗔𝗙𝗘" : "🔴 𝗨𝗣𝗗𝗔𝗧𝗜𝗡𝗚";

  const hasUpdate = Object.values(data).includes("update");

  return new EmbedBuilder()
    .setColor(hasUpdate ? 0xff0033 : 0x00ffaa)
    .setTitle("🚀 TRẠNG THÁI HACK FREE FIRE")
    .setDescription(
      "```ansi\n\u001b[1;36m📡 Hệ thống theo dõi theo thời gian thực[0m\n```"
    )
    .addFields(
      {
        name: "💎 FLUORITE",
        value: `\`\`\`diff\n+ ${statusIcon(data["Fluorite"])}\n\`\`\``,
        inline: true
      },
      {
        name: "🔥 MIGUL VN",
        value: `\`\`\`diff\n+ ${statusIcon(data["Migul VN"])}\n\`\`\``,
        inline: true
      },
      {
        name: "⚡ SONIC",
        value: `\`\`\`diff\n+ ${statusIcon(data["Sonic"])}\n\`\`\``,
        inline: true
      },
      {
        name: "🎯 PROXY AIM",
        value: `\`\`\`diff\n+ ${statusIcon(data["Proxy Aim"])}\n\`\`\``,
        inline: true
      }
    )
    .addFields({
      name: "━━━━━━━━━━━━━━━━━━",
      value: "📢 Auto Update • Chính xác • Realtime"
    })
    .setThumbnail("https://files.catbox.moe/wpeovp.webp") // 👈 thay link ảnh vào đây
    .setFooter({
      text: "⚡ Premium Bot System - By 𝓠丶𝓚𝓱𝓪́𝓷𝓱"
    })
    .setTimestamp();
}

// ===== UI =====
function createButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("edit_status").setLabel("⚙️ Trạng Thái").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("download_menu").setLabel("📥 Tải Hack").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("buy_proxy").setLabel("💰 Buy Proxy").setStyle(ButtonStyle.Success)
    )
  ];
}

// ===== STATUS MENU =====
function statusToolMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("status_tool")
      .addOptions([
        { label: "Fluorite", value: "Fluorite" },
        { label: "Migul VN", value: "Migul VN" },
        { label: "Sonic", value: "Sonic" },
        { label: "Proxy Aim", value: "Proxy Aim" }
      ])
  );
}

function statusValueMenu(tool) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`status_value_${tool}`)
      .addOptions([
        { label: "🟢 An toàn", value: "safe" },
        { label: "🔴 Cập nhật", value: "update" }
      ])
  );
}

// ===== DOWNLOAD =====
function downloadMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("download_select")
      .addOptions([
        { label: "Fluorite", value: "flu" },
        { label: "Migul VN", value: "migul" },
        { label: "Sonic", value: "sonic" },
        { label: "Proxy", value: "proxy" }
      ])
  );
}

// ===== BUY =====
function proxyMenu() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("proxy_type")
      .addOptions([
        { label: "🔥 Drag Anten", value: "Drag_Antena" },
        { label: "⚡ Drag NoAnten", value: "Drag_NoAntena" },
        { label: "🎯 Body NoAnten", value: "Body_NoAntena" }
      ])
  );
}

const prices = {
  Drag_Antena: { week: 100000, month: 200000 },
  Drag_NoAntena: { week: 125000, month: 225000 },
  Body_NoAntena: { week: 80000, month: 170000 }
};

function timeMenu(type) {
  const p = prices[type];
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`time_${type}`)
      .addOptions([
        { label: `Tuần - ${p.week.toLocaleString("vi-VN")}đ`, value: "week" },
        { label: `Tháng - ${p.month.toLocaleString("vi-VN")}đ`, value: "month" }
      ])
  );
}

// ===== QR =====
function createQR(amount, userId, type, time, orderId) {
  const content = encodeURIComponent(
    `${orderId} | ${type} ${time} | ID${userId}`
  );
  return `https://img.vietqr.io/image/${BANK_NAME}-${BANK_ACC}-compact.png?amount=${amount}&addInfo=${content}`;
}

// ===== READY =====
client.once("ready", async () => {
  const data = loadData();
  const ch = await client.channels.fetch(CHANNEL_ID);

  const msg = await ch.send({
    embeds: [createEmbed(data)],
    components: createButtons()
  });

  data.messageId = msg.id;
  saveData(data);

  console.log("✅ Bot đã online");
});

// ===== INTERACTION =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  if (interaction.customId === "edit_status") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Chỉ admin!", ephemeral: true });
    }
    return interaction.reply({ content: "⚙️ Chọn loại:", components: [statusToolMenu()], ephemeral: true });
  }

  if (interaction.customId === "status_tool") {
    return interaction.update({
      content: "🔧 Chọn trạng thái:",
      components: [statusValueMenu(interaction.values[0])]
    });
  }

  if (interaction.customId.startsWith("status_value_")) {
    const tool = interaction.customId.replace("status_value_", "");
    const value = interaction.values[0];

    const data = loadData();
    data[tool] = value;
    saveData(data);

    const channel = await client.channels.fetch(CHANNEL_ID);
    const msg = await channel.messages.fetch(data.messageId);

    await msg.edit({
      embeds: [createEmbed(data)],
      components: createButtons()
    });

    return interaction.update({ content: "✅ Đã cập nhật!", components: [] });
  }

  // ===== BUY =====
  if (interaction.customId === "buy_proxy") {
    return interaction.reply({ content: "💰 Chọn loại:", components: [proxyMenu()], ephemeral: true });
  }

  if (interaction.customId === "proxy_type") {
    await interaction.deferUpdate();
    return interaction.editReply({
      content: "⏳ Chọn HSD:",
      components: [timeMenu(interaction.values[0])]
    });
  }

  if (interaction.customId.startsWith("time_")) {
    await interaction.deferUpdate();

    const type = interaction.customId.replace("time_", "");
    const time = interaction.values[0];
    const price = prices[type][time];

    const orderId = generateOrderId();
    orders.set(interaction.user.id, { type, time, price, orderId });

    const qr = createQR(price, interaction.user.id, type, time, orderId);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💳 Thanh toán")
          .setImage(qr)
          .addFields(
            { name: "🧾 Mã đơn", value: orderId },
            { name: "📦 Gói", value: `${type} (${time})` },
            { name: "💰 Giá", value: `${price.toLocaleString("vi-VN")}đ` }
          )
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_bank_${interaction.user.id}`)
            .setLabel("✅ Xác nhận")
            .setStyle(ButtonStyle.Success)
        )
      ]
    });
  }

  if (interaction.customId.startsWith("confirm_bank_")) {
    const userId = interaction.customId.split("_")[2];

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "❌ Không phải đơn của bạn!", ephemeral: true });
    }

    const order = orders.get(userId);
    if (!order) {
      return interaction.reply({ content: "❌ Không tìm thấy đơn!", ephemeral: true });
    }

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📩 Đơn hàng")
          .addFields(
            { name: "🧾 Mã đơn", value: order.orderId },
            { name: "👤 Người mua", value: `<@${userId}>` },
            { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
            { name: "💰 Giá", value: `${order.price.toLocaleString("vi-VN")}đ` }
          )
      ]
    });

    return interaction.reply({ content: "🧾 Đã gửi đơn!", ephemeral: true });
  }
});

client.login(TOKEN);
