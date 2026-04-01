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

// ===== EMBED =====
function createEmbed(data) {
  const statusIcon = (s) => (s === "safe" ? "🟢 SAFE" : "🔴 UPDATE");
  const hasUpdate = Object.values(data).includes("update");

  return new EmbedBuilder()
    .setColor(hasUpdate ? 0xff0033 : 0x00ffaa)
    .setTitle("🚀 TRẠNG THÁI TOOL FREE FIRE")
    .setDescription("📡 Hệ thống đang hoạt động realtime")
    .addFields(
      { name: "💎 Fluorite", value: statusIcon(data["Fluorite"]), inline: true },
      { name: "🔥 Migul VN", value: statusIcon(data["Migul VN"]), inline: true },
      { name: "⚡ Sonic", value: statusIcon(data["Sonic"]), inline: true },
      { name: "🎯 Proxy Aim", value: statusIcon(data["Proxy Aim"]), inline: true }
    )
    .setThumbnail("https://files.catbox.moe/wpeovp.webp")
    .setFooter({ text: "⚡ Premium Bot" })
    .setTimestamp();
}

// ===== BUTTON =====
function createButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("edit_status")
        .setLabel("⚙️ Trạng Thái")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("download_menu")
        .setLabel("📥 Tải Hack")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("buy_proxy")
        .setLabel("💰 Buy Proxy")
        .setStyle(ButtonStyle.Success)
    )
  ];
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
  Body_NoAnten: { week: 80000, month: 170000 }
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
  const content = encodeURIComponent(`${orderId} | ${type} ${time} | ID${userId}`);
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

  console.log("✅ Bot online");
});

// ===== INTERACTION =====
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  // ===== STATUS =====
  if (interaction.customId === "edit_status") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "❌ Chỉ admin!", ephemeral: true });

    return interaction.reply({
      content: "⚙️ Chọn loại:",
      components: [statusToolMenu()],
      ephemeral: true
    });
  }

  // ===== DOWNLOAD =====
  if (interaction.customId === "download_menu") {
    return interaction.reply({ content: "📥 Chọn hack:", components: [downloadMenu()], ephemeral: true });
  }

  if (interaction.customId === "download_select") {
    await interaction.deferUpdate();
    const links = {
      flu: "https://www.mediafire.com/file/z1lnm953slckxl0/FF.ipa",
      migul: "https://www.mediafire.com/file/xxx",
      sonic: "https://www.mediafire.com/file/yyy"
    };

    if (interaction.values[0] === "proxy") {
      return interaction.editReply({ content: "🔒 Mua để nhận!", components: [] });
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setTitle("📥 Link tải").setDescription(links[interaction.values[0]])],
      components: []
    });
  }

  // ===== BUY =====
  if (interaction.customId === "buy_proxy") {
    return interaction.reply({ content: "💰 Chọn loại:", components: [proxyMenu()], ephemeral: true });
  }

  if (interaction.customId === "proxy_type") {
    await interaction.deferUpdate();
    return interaction.editReply({ content: "⏳ Chọn thời gian:", components: [timeMenu(interaction.values[0])] });
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
            { name: "🧾 Mã đơn", value: `${orderId}` },
            { name: "📦 Gói", value: `${type} (${time})` },
            { name: "💰 Giá", value: `${price.toLocaleString("vi-VN")}đ` }
          )
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirm_${interaction.user.id}`).setLabel("✅ Tôi đã chuyển khoản").setStyle(ButtonStyle.Success)
        )
      ]
    });
  }

  // ===== CONFIRM =====
  if (interaction.customId.startsWith("confirm_")) {
    const userId = interaction.customId.split("_")[1];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: "❌ Không phải đơn của bạn!", ephemeral: true });

    const order = orders.get(userId);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${userId}`).setLabel("✅ Duyệt").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${userId}`).setLabel("❌ Huỷ").setStyle(ButtonStyle.Danger)
    );

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📩 Đơn hàng")
          .addFields(
            { name: "🧾 Mã đơn", value: `${order.orderId}` },
            { name: "👤 User", value: `<@${userId}>` },
            { name: "📦 Gói", value: `${order.type} (${order.time})` },
            { name: "💰 Giá", value: `${order.price.toLocaleString("vi-VN")}đ` }
          )
      ],
      components: [row]
    });

    return interaction.reply({ content: "📩 Đã gửi admin duyệt!", ephemeral: true });
  }

  // ===== APPROVE MODAL =====
  if (interaction.customId.startsWith("approve_")) {
    const userId = interaction.customId.split("_")[1];

    const modal = new ModalBuilder().setCustomId(`sendkey_${userId}`).setTitle("Nhập key cho khách");

    const input = new TextInputBuilder()
      .setCustomId("key")
      .setLabel("Nhập key")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }

  if (interaction.customId.startsWith("sendkey_")) {
    const userId = interaction.customId.split("_")[1];
    const key = interaction.fields.getTextInputValue("key");

    const order = orders.get(userId);
    if (!order) return interaction.reply({ content: "❌ Không tìm thấy đơn!", ephemeral: true });

    const expire = getExpireDate(order.time);
    const user = await client.users.fetch(userId);

    const embed = new EmbedBuilder()
      .setTitle("🧾 HOÁ ĐƠN")
      .setColor("Green")
      .addFields(
        { name: "🧾 Mã đơn", value: `${order.orderId}` },
        { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
        { name: "💰 Giá", value: `${order.price.toLocaleString("vi-VN")}đ` },
        { name: "⏳ Thời hạn", value: `${expire}` },
        { name: "🔑 Key", value: `\`${key}\`` }
      )
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return interaction.reply({ content: "✅ Đã gửi key cho khách!", ephemeral: true });
  }

  // ===== REJECT =====
  if (interaction.customId.startsWith("reject_")) {
    const userId = interaction.customId.split("_")[1];
    const order = orders.get(userId);
    if (!order) return interaction.reply({ content: "❌ Không có đơn!", ephemeral: true });

    const user = await client.users.fetch(userId);
    const embed = new EmbedBuilder()
      .setTitle("🧾 HOÁ ĐƠN")
      .setColor("Red")
      .addFields(
        { name: "🧾 Mã đơn", value: `${order.orderId}` },
        { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
        { name: "💰 Giá", value: `${order.price.toLocaleString("vi-VN")}đ` },
        { name: "🔑 Key", value: "BUY LÀ CÓ KEY" }
      )
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return interaction.reply({ content: "❌ Đã huỷ đơn!", ephemeral: true });
  }
});

client.login(TOKEN);
