import { Body, Controller, Get, Param, Post, Query, UnauthorizedException } from '@nestjs/common';
import { TenantService } from '../../../../shared/multi-tenancy/tenant.service';
import { CourseCatalogService } from './course-catalog.service';

@Controller('learning-development/employee/catalog')
export class CourseCatalogController {
  constructor(
    private readonly service: CourseCatalogService,
    private readonly tenantService: TenantService,
  ) {}

  private getOrgIdOrThrow(): string {
    const orgId = this.tenantService.getOrgId();
    if (!orgId) throw new UnauthorizedException('Missing organization context');
    return orgId;
  }

  private getUserIdOrThrow(): string {
    const userId = this.tenantService.getUserId();
    if (!userId) throw new UnauthorizedException('Missing user context');
    return userId;
  }

  @Get()
  async browse(
    @Query('difficulty') difficulty?: string,
    @Query('format') format?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.service.browseCourses(this.getOrgIdOrThrow(), { difficulty, format, type, search });
  }

  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.service.getCourseDetail(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }

  @Post(':id/enroll')
  async enroll(@Param('id') id: string) {
    return this.service.selfEnroll(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }

  @Post(':id/bookmark')
  async bookmark(@Param('id') id: string) {
    return this.service.bookmarkCourse(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id);
  }

  @Post(':id/rate')
  async rate(@Param('id') id: string, @Body() body: { rating: number; review?: string }) {
    return this.service.rateCourse(this.getOrgIdOrThrow(), this.getUserIdOrThrow(), id, body);
  }
}
