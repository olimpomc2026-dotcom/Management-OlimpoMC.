const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const ALLOWED_ROLES = [
  process.env.ROLE_OWNER, process.env.ROLE_CO_OWNER, process.env.ROLE_MANAGER,
  process.env.ROLE_COORDINADOR, process.env.ROLE_PLATFORM_ADMIN, process.env.ROLE_HEAD_ADMIN,
  process.env.ROLE_SR_ADMIN, process.env.ROLE_ADMIN, process.env.ROLE_JR_ADMIN
].filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removesanction')
    .setDescription('Retira Warns y/o Strikes a un miembro del staff.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt => opt.setName('staff').setDescription('Usuario de Discord').setRequired(true))
    .addStringOption(opt => opt.setName('ign').setDescription('Nombre de usuario en Minecraft').setRequired(true))
    .addIntegerOption(opt => opt.setName('warns').setDescription('Warns a retirar').setRequired(true))
    .addIntegerOption(opt => opt.setName('strikes').setDescription('Strikes a retirar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón del retiro').setRequired(true)),

  async execute(interaction) {
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getUser('staff');
    const ign = interaction.options.getString('ign');
    const remWarns = interaction.options.getInteger('warns');
    const remStrikes = interaction.options.getInteger('strikes');
    const reason = interaction.options.getString('razon');

    const current = await db.getStaff(target.id);

    // Evitar contadores negativos
    const finalWarns = Math.max(0, current.warns - remWarns);
    const finalStrikes = Math.max(0, current.strikes - remStrikes);

    await db.updateStaff(target.id, finalWarns, finalStrikes);
    await db.addLog(target.id, interaction.user.id, ign, 'REMOVE', -remWarns, -remStrikes, reason);

    let removedDetails = [];
    if (remWarns > 0) removedDetails.push(`-${remWarns} Warn(s)`);
    if (remStrikes > 0) removedDetails.push(`-${remStrikes} Strike(s)`);
    const removedText = removedDetails.join(' | ') || 'Ninguno';

    const logMessage = 
`**IGN:** ${ign}
**Razon:** ${reason}
**Añadido:** Retiro (${removedText})
**Total:** ${finalWarns} Warn(s) | ${finalStrikes} Strike(s)`;

    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send(logMessage);
    }

    return interaction.reply({ content: `✅ Sanción retirada correctamente a **${ign}**.`, ephemeral: true });
  }
};
