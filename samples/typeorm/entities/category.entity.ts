import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

@Entity('categories')
export class CategoryEntity {

  @PrimaryColumn()
  public id!: number;

  @Column({ length: 150 })
  public name!: string;

  @Column()
  public creatorId!: number;

  @OneToMany(() => PostEntity, entity => entity.category)
  public posts!: PostEntity[];

  @ManyToOne(() => UserEntity, entity => entity.categories)
  public creator!: UserEntity;

  constructor(entity?: Partial<CategoryEntity>) {
    Object.assign(this, { ...entity });
  }

}
