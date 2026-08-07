const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');

const ALLOWED_ROLES = [
  process.env.ROLE_OWNER,
  process.env.ROLE_CO_OWNER,
  process.env.ROLE_MANAGER,
  process.env.ROLE_COORDINADOR,
  process.env.ROLE_PLATFORM_ADMIN,
  process.env.ROLE_HEAD_ADMIN,
  process.env.ROLE_SR_ADMIN,
  process.env.ROLE_ADMIN,
  process.env.ROLE_JR_ADMIN
].filter(Boolean);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addsanction')
    .setDescription('Añade Warns y/o Strikes a un miembro del staff.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption(opt => opt.setName('staff').setDescription('Usuario de Discord').setRequired(true))
    .addStringOption(opt => opt.setName('ign').setDescription('Nombre de usuario en Minecraft').setRequired(true))
    .addIntegerOption(opt => opt.setName('warns').setDescription('Cantidad de Warns').setRequired(true))
    .addIntegerOption(opt => opt.setName('strikes').setDescription('Cantidad de Strikes').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Razón de la sanción').setRequired(true)),

  async execute(interaction) {
    // Validar permisos del ejecutor
    const hasRole = interaction.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole) {
      return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', ephemeral: true });
    }

    const target = interaction.options.getUser('staff');
    const ign = interaction.options.getString('ign');
    const addedWarns = interaction.options.getInteger('warns');
    const addedStrikes = interaction.options.getInteger('strikes');
    const reason = interaction.options.getString('razon');

    const current = await db.getStaff(target.id);

    // Conversión matemática: 3 Warns = 1 Strike
    const tempWarns = current.warns + addedWarns;
    const autoStrikes = Math.floor(tempWarns / 3);
    const finalWarns = tempWarns % 3;
    const finalStrikes = current.strikes + addedStrikes + autoStrikes;

    // Actualizar base de datos
    await db.updateStaff(target.id, finalWarns, finalStrikes);
    await db.addLog(target.id, interaction.user.id, ign, 'ADD', addedWarns, addedStrikes + autoStrikes, reason);

    // Construcción del texto de añadidos
    let addedDetails = [];
    if (addedWarns > 0) addedDetails.push(`+${addedWarns} Warn(s)`);
    if (addedStrikes > 0) addedDetails.push(`+${addedStrikes} Strike(s)`);
    if (autoStrikes > 0) addedDetails.push(`(+${autoStrikes} Strike por conversión de 3 Warns)`);
    const addedText = addedDetails.join(' | ') || 'Ninguno';

    // Plantilla exacta solicitada
    const logMessage = 
`**IGN:** ${ign}
**Razon:** ${reason}
**Añadido:** ${addedText}
**Total:** ${finalWarns} Warn(s) | ${finalStrikes} Strike(s)`;

    // Enviar al canal de logs
    const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send(logMessage);
    }

    return interaction.reply({ content: `✅ Sanción registrada con éxito para **${ign}**.`, ephemeral: true });
  }
};
