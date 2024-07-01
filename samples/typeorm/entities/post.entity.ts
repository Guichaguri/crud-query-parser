import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity('posts')
export class PostEntity {

  @PrimaryColumn()
  public id!: number;

  @Column({ length: 150 })
  public title!: string;

  @Column()
  public content!: string;

  @Column()
  public categoryId!: number;

  @Column({ default: true })
  public isActive!: boolean;

  @ManyToOne(() => CategoryEntity, entity => entity.posts)
  public category!: CategoryEntity;

  constructor(entity?: Partial<PostEntity>) {
    Object.assign(this, { ...entity });
  }

}
