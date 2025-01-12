import { DataTypes, Sequelize } from 'sequelize';

export const sequelize = new Sequelize('sqlite::memory:');

export const Category = sequelize.define(
  'Category',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {},
);

export const Post = sequelize.define(
  'Post',
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {},
);

Category.hasMany(Post);
Post.belongsTo(Category);
