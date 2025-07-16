import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { CategoryEntity } from './category.entity';

@Entity('users')
export class UserEntity {

  @PrimaryColumn()
  public id!: number;

  @Column({ length: 150 })
  public name!: string;

  @OneToMany(() => CategoryEntity, entity => entity.creator)
  public categories!: CategoryEntity[];

  constructor(entity?: Partial<CategoryEntity>) {
    Object.assign(this, { ...entity });
  }

}
