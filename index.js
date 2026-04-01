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
  const embed = new EmbedBuilder()
    .setTitle("📢 Thông Báo Update Hack")
    .setColor(0x00AEFF);

  ["Fluorite", "Migul VN", "Sonic", "Proxy Aim"].forEach(t => {
    const icon = data[t] === "safe" ? "🟢" : "🔴";
    embed.addFields({ name: t, value: `${icon} ${data[t].toUpperCase()}` });
  });

  return embed;
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
        { label: `Tuần - ${p.week}`, value: "week" },
        { label: `Tháng - ${p.month}`, value: "month" }
      ])
  );
}

// ===== QR =====
function createQR(amount, userId, type, time, orderId) {
  const content = `${orderId} | ${type} ${time} | ID${userId}`;
  return `https://img.vietqr.io/image/${BANK_NAME}-${BANK_ACC}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}`;
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

  // ===== STATUS ADMIN =====
  if (interaction.customId === "edit_status") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Chỉ admin mới có thể dùng!", ephemeral: true });
    }
    return interaction.reply({ content: "⚙️ Chọn loại:", components: [statusToolMenu()], ephemeral: true });
  }

  if (interaction.customId === "status_tool") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Không có quyền!", ephemeral: true });
    }
    return interaction.update({
      content: "🔧 Chọn trạng thái:",
      components: [statusValueMenu(interaction.values[0])]
    });
  }

  if (interaction.customId.startsWith("status_value_")) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Không có quyền!", ephemeral: true });
    }

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

  // ===== DOWNLOAD =====
  if (interaction.customId === "download_menu") {
    return interaction.reply({ content: "📥 Chọn Hack:", components: [downloadMenu()], ephemeral: true });
  }

  if (interaction.customId === "download_select") {
    await interaction.deferUpdate();

    const links = {
      flu: "https://www.mediafire.com/file/z1lnm953slckxl0/FF.ipa",
      migul: "https://www.mediafire.com/file/xxx",
      sonic: "https://www.mediafire.com/file/yyy"
    };

    if (interaction.values[0] === "proxy") {
      return interaction.editReply({ content: "🔒 Khi mua sẽ được cấp!", components: [] });
    }

    return interaction.editReply({
      embeds: [new EmbedBuilder().setTitle("📥 Link").setDescription(links[interaction.values[0]])],
      components: []
    });
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
            { name: "💰 Giá", value: `${price}` }
          )
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("confirm_bank").setLabel("✅ Xác nhận").setStyle(ButtonStyle.Success)
        )
      ]
    });
  }

  if (interaction.customId === "confirm_bank") {
    const order = orders.get(interaction.user.id);
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📩 Đơn hàng")
      .addFields(
        { name: "🧾 Mã đơn", value: order.orderId },
        { name: "👤 Người mua", value: `<@${interaction.user.id}>` },
        { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
        { name: "💰 Giá", value: `${order.price}` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`approve_${interaction.user.id}`).setLabel("✅ Duyệt").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel("❌ Từ chối").setStyle(ButtonStyle.Danger)
    );

    await logChannel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: "🧾 Đã gửi đơn . Duyệt xong key sẽ được gửi cho bạn!", ephemeral: true });
  }

  // ===== APPROVE =====
  if (interaction.customId.startsWith("approve_")) {
    const userId = interaction.customId.split("_")[1];

    const modal = new ModalBuilder()
      .setCustomId(`sendkey_${userId}`)
      .setTitle("Nhập key");

    const input = new TextInputBuilder()
      .setCustomId("key")
      .setLabel("Key")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  if (interaction.customId.startsWith("sendkey_")) {
    const userId = interaction.customId.split("_")[1];
    const key = interaction.fields.getTextInputValue("key");

    const order = orders.get(userId);
    const expire = getExpireDate(order.time);

    const user = await client.users.fetch(userId);

    const embedUser = new EmbedBuilder()
      .setTitle("🧾 Hoá đơn")
      .setColor("Green")
      .addFields(
        { name: "🧾 Mã đơn", value: order.orderId },
        { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
        { name: "💰 Giá tiền", value: `${order.price}` },
        { name: "⏳ Thời gian", value: expire },
        { name: "🔑 Key", value: `\`${key}\`` }
      );

    await user.send({ embeds: [embedUser] });

    // UPDATE ADMIN EMBED
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Green")
      .addFields({ name: "✅ Trạng thái", value: "Đã duyệt" });

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: []
    });

    return interaction.reply({ content: "✅ Đã duyệt!", ephemeral: true });
  }

  // ===== REJECT =====
  if (interaction.customId.startsWith("reject_")) {
    const userId = interaction.customId.split("_")[1];
    const order = orders.get(userId);
    const user = await client.users.fetch(userId);

    const embedUser = new EmbedBuilder()
      .setTitle("🧾 Hoá đơn")
      .setColor("Red")
      .addFields(
        { name: "🧾 Mã đơn", value: order.orderId },
        { name: "📦 Vật phẩm", value: `${order.type} (${order.time})` },
        { name: "💰 Giá tiền", value: `${order.price}` },
        { name: "🔑 Key", value: "💳 Bank để nhận key" }
      );

    await user.send({ embeds: [embedUser] });

    // UPDATE ADMIN EMBED
    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor("Red")
      .addFields({ name: "❌ Trạng thái", value: "Đã từ chối" });

    await interaction.message.edit({
      embeds: [updatedEmbed],
      components: []
    });

    return interaction.reply({ content: "❌ Đã từ chối!", ephemeral: true });
  }
});

client.login(TOKEN);
