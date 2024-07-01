import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { PostEntity } from './post.entity';

@Entity('category')
export class CategoryEntity {

  @PrimaryColumn()
  public id!: number;

  @Column({ length: 150 })
  public name!: string;

  @ManyToOne(() => PostEntity, entity => entity.category)
  public posts!: PostEntity[];

  constructor(entity?: Partial<CategoryEntity>) {
    Object.assign(this, { ...entity });
  }

}
