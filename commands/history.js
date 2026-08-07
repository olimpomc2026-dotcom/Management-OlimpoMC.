const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../db');

const ALLOWED_ROLES = [
  process.env.ROLE_OWNER, process.env.ROLE_CO_OWNER, process.env.ROLE_MANAGER,
  process.env.ROLE_COORDINADOR, process.env.ROLE_PLATFORM_ADMIN, process.env.ROLE_HEAD_ADMIN,
  process.env.ROLE_SR_ADMIN, process.env.ROLE_ADMIN, process.env.ROLE_JR_ADMIN
].filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('Muestra el expediente de sanciones de un miembro del staff.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt => opt.setName('staff').setDescription('Usuario de Discord').setRequired(true)),

  async execute(interaction) {
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return interaction.reply({ content: '❌ No tienes permisos para consultar expedientes.', ephemeral: true });
    }

    const target = interaction.options.getUser('staff');
    const current = await db.getStaff(target.id);
    const logs = await db.getHistory(target.id);

    const embed = new EmbedBuilder()
      .setTitle(`📋 Expediente de Staff: ${target.tag}`)
      .setColor(0x2B2D31)
      .setDescription(`**Estado Actual:** ${current.warns} Warn(s) | ${current.strikes} Strike(s)`)
      .setTimestamp();

    if (logs.length === 0) {
      embed.addFields({ name: 'Historial', value: 'Sin sanciones registradas.' });
    } else {
      const historyText = logs.map((l, i) => 
        `**${i + 1}. [${l.action_type}]** IGN: \`${l.ign}\` | Razon: ${l.reason} (<@${l.mod_id}>)`
      ).join('\n');
      embed.addFields({ name: 'Últimos Eventos', value: historyText });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
